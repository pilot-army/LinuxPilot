import { Inject, Injectable } from '@nestjs/common';
import {
  AUTH_ERROR_CODES,
  type AuthenticatedUser,
  type InternalLoginRequest,
  type LoginResult,
  type PublicUser,
  type RoleName,
  type SessionView,
  type UserStatus,
} from '@linuxpilot/auth-contracts';
import { AppError } from '@linuxpilot/common';
import { type AppLogger } from '@linuxpilot/logger';
import { type Session } from '@prisma/client';
import { LOGGER } from '../../common/logger/logger.token';
import { hashRefreshToken, safeEqual } from '../../common/crypto/token.util';
import { PasswordService } from '../../common/crypto/password.service';
import { AppConfigService } from '../../config/app-config.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit.types';
import { SessionsService } from '../sessions/sessions.service';
import { UsersService, type UserAccessContext } from '../users/users.service';
import { TokenService } from './token.service';

const DUMMY_HASH = hashRefreshToken('00000000-0000-4000-8000-000000000000.timing-safe-dummy');

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
    private readonly auditService: AuditService,
    private readonly config: AppConfigService,
    @Inject(LOGGER) private readonly logger: AppLogger,
  ) {}

  async login(input: InternalLoginRequest, requestId?: string): Promise<LoginResult> {
    const user = await this.usersService.findForLogin(input.emailOrUsername);
    if (!user) {
      await this.passwordService.verifyDummy(input.password);
      await this.auditService.record({
        action: AUDIT_ACTIONS.LOGIN_FAILURE,
        targetType: 'user',
        requestId,
        ipAddress: input.ipAddress,
        metadata: { reason: 'unknown_identity' },
      });
      throw invalidCredentials();
    }

    const passwordMatches = await this.passwordService.verify(user.passwordHash, input.password);
    if (!passwordMatches) {
      await this.auditService.record({
        actorId: user.id,
        action: AUDIT_ACTIONS.LOGIN_FAILURE,
        targetType: 'user',
        targetId: user.id,
        requestId,
        ipAddress: input.ipAddress,
        metadata: { reason: 'password' },
      });
      throw invalidCredentials();
    }

    this.usersService.assertUserCanAuthenticate(user.status);
    this.logger.info({ userId: user.id }, 'User authenticated');
    const result = await this.issueTokens(user, input.userAgent, input.ipAddress);
    await this.auditService.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.LOGIN_SUCCESS,
      targetType: 'user',
      targetId: user.id,
      requestId,
      ipAddress: input.ipAddress,
    });
    return result;
  }

  async refresh(
    refreshToken: string,
    requestId?: string,
    ipAddress?: string,
  ): Promise<LoginResult> {
    const parsed = this.tokenService.parseRefreshToken(refreshToken);
    const session = await this.sessionsService.getById(parsed.sessionId);

    if (!session) {
      safeEqual(parsed.hash, DUMMY_HASH);
      throw tokenInvalid();
    }

    if (safeEqual(session.refreshTokenHash, parsed.hash)) {
      return this.rotateCurrent(session, parsed.hash);
    }

    const matchesPrevious =
      typeof session.previousRefreshTokenHash === 'string' &&
      safeEqual(session.previousRefreshTokenHash, parsed.hash);
    const used =
      matchesPrevious ||
      (await this.sessionsService.hasUsedRefreshHash(session.familyId, parsed.hash));

    if (!used) {
      throw tokenInvalid();
    }

    const graceMs = this.config.env.REFRESH_REUSE_GRACE_MS;
    const recentlyRotated =
      matchesPrevious &&
      session.rotatedAt !== null &&
      this.config.nowMs() - session.rotatedAt.getTime() <= graceMs;

    if (recentlyRotated) {
      this.logger.warn({ sessionId: session.id }, 'Concurrent refresh retry ignored');
      throw tokenInvalid();
    }

    await this.sessionsService.revokeFamily(session.familyId);
    this.logger.warn(
      { userId: session.userId, familyId: session.familyId, sessionId: session.id },
      'Refresh token reuse detected',
    );
    await this.auditService.record({
      actorId: session.userId,
      action: AUDIT_ACTIONS.REFRESH_REUSE,
      targetType: 'session_family',
      targetId: session.familyId,
      requestId,
      ipAddress,
      metadata: { sessionId: session.id },
    });
    throw new AppError(AUTH_ERROR_CODES.REFRESH_TOKEN_REUSE, 'Refresh token reuse detected', 401);
  }

  async logout(
    refreshToken: string | undefined,
    currentSessionId?: string,
    actorId?: string,
    requestId?: string,
    ipAddress?: string,
  ): Promise<void> {
    let revokedSessionId: string | undefined;

    if (refreshToken) {
      const parsed = this.tokenService.parseRefreshToken(refreshToken);
      const session = await this.sessionsService.getById(parsed.sessionId);
      if (session && safeEqual(session.refreshTokenHash, parsed.hash) && !session.revokedAt) {
        await this.sessionsService.revoke(session.id);
        revokedSessionId = session.id;
      }
    } else if (currentSessionId) {
      await this.sessionsService.revoke(currentSessionId);
      revokedSessionId = currentSessionId;
    }

    if (revokedSessionId) {
      await this.auditService.record({
        actorId,
        action: AUDIT_ACTIONS.LOGOUT,
        targetType: 'session',
        targetId: revokedSessionId,
        requestId,
        ipAddress,
      });
    }
  }

  async logoutAll(userId: string, requestId?: string, ipAddress?: string): Promise<void> {
    await this.sessionsService.revokeAllForUser(userId);
    await this.auditService.record({
      actorId: userId,
      action: AUDIT_ACTIONS.SESSION_REVOKE_ALL,
      targetType: 'user',
      targetId: userId,
      requestId,
      ipAddress,
    });
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.usersService.getAuthenticatedContext(userId);
    return this.usersService.toPublicUser(user);
  }

  listSessions(user: AuthenticatedUser): Promise<SessionView[]> {
    return this.sessionsService.listForUser(user.id, user.sessionId);
  }

  async revokeSession(
    userId: string,
    sessionId: string,
    requestId?: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.sessionsService.revokeOwned(userId, sessionId);
    await this.auditService.record({
      actorId: userId,
      action: AUDIT_ACTIONS.SESSION_REVOKE,
      targetType: 'session',
      targetId: sessionId,
      requestId,
      ipAddress,
    });
  }

  async changeUserStatus(
    actorId: string,
    userId: string,
    status: UserStatus,
    requestId?: string,
    ipAddress?: string,
  ): Promise<PublicUser> {
    const user = await this.usersService.changeStatus(userId, status);
    await this.auditService.record({
      actorId,
      action: AUDIT_ACTIONS.USER_STATUS_CHANGE,
      targetType: 'user',
      targetId: userId,
      requestId,
      ipAddress,
      metadata: { status },
    });
    return user;
  }

  async changeUserRoles(
    actorId: string,
    userId: string,
    roles: RoleName[],
    requestId?: string,
    ipAddress?: string,
  ): Promise<PublicUser> {
    const user = await this.usersService.replaceRoles(userId, roles);
    await this.auditService.record({
      actorId,
      action: AUDIT_ACTIONS.USER_ROLES_CHANGE,
      targetType: 'user',
      targetId: userId,
      requestId,
      ipAddress,
      metadata: { roles: roles.join(',') },
    });
    return user;
  }

  private async rotateCurrent(session: Session, presentedHash: string): Promise<LoginResult> {
    if (session.revokedAt) {
      throw new AppError(AUTH_ERROR_CODES.SESSION_REVOKED, 'Session has been revoked', 401);
    }
    if (session.expiresAt.getTime() <= this.config.nowMs()) {
      throw new AppError(AUTH_ERROR_CODES.SESSION_EXPIRED, 'Session has expired', 401);
    }

    const user = await this.usersService.getAuthenticatedContext(session.userId);
    const rotated = this.tokenService.createRefreshToken(session.id);
    const won = await this.sessionsService.rotateIfCurrentHash({
      id: session.id,
      expectedHash: presentedHash,
      nextHash: rotated.hash,
      familyId: session.familyId,
    });

    if (!won) {
      const latest = await this.sessionsService.getById(session.id);
      const graceMs = this.config.env.REFRESH_REUSE_GRACE_MS;
      const concurrent =
        latest &&
        latest.previousRefreshTokenHash &&
        safeEqual(latest.previousRefreshTokenHash, presentedHash) &&
        latest.rotatedAt !== null &&
        this.config.nowMs() - latest.rotatedAt.getTime() <= graceMs;

      if (concurrent) {
        this.logger.warn({ sessionId: session.id }, 'Concurrent refresh retry ignored');
        throw tokenInvalid();
      }

      if (latest) {
        await this.sessionsService.revokeFamily(latest.familyId);
        this.logger.warn(
          { userId: latest.userId, familyId: latest.familyId, sessionId: latest.id },
          'Refresh token reuse detected',
        );
      }
      throw new AppError(AUTH_ERROR_CODES.REFRESH_TOKEN_REUSE, 'Refresh token reuse detected', 401);
    }

    return {
      accessToken: this.signAccess(user, session.id),
      refreshToken: rotated.token,
      expiresIn: this.tokenService.getAccessTtlSeconds(),
      user: this.usersService.toPublicUser(user),
    };
  }

  private async issueTokens(
    user: UserAccessContext,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<LoginResult> {
    const sessionId = this.tokenService.createSessionId();
    const refresh = this.tokenService.createRefreshToken(sessionId);

    await this.sessionsService.create({
      id: sessionId,
      userId: user.id,
      familyId: sessionId,
      refreshTokenHash: refresh.hash,
      userAgent,
      ipAddress,
      expiresAt: new Date(this.config.nowMs() + this.tokenService.getRefreshTtlMs()),
    });

    return {
      accessToken: this.signAccess(user, sessionId),
      refreshToken: refresh.token,
      expiresIn: this.tokenService.getAccessTtlSeconds(),
      user: this.usersService.toPublicUser(user),
    };
  }

  private signAccess(user: UserAccessContext, sessionId: string): string {
    return this.tokenService.signAccessToken({
      sub: user.id,
      sid: sessionId,
      email: user.email,
      username: user.username,
      roles: user.roles,
      permissions: user.permissions,
    });
  }
}

function invalidCredentials(): AppError {
  return new AppError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, 'Invalid credentials', 401);
}

function tokenInvalid(): AppError {
  return new AppError(AUTH_ERROR_CODES.TOKEN_INVALID, 'Refresh token is invalid', 401);
}
