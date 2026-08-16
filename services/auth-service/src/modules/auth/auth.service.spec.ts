import { AUTH_ERROR_CODES, USER_STATUSES } from '@linuxpilot/auth-contracts';
import { AppError } from '@linuxpilot/common';
import { type Session } from '@prisma/client';
import { AuthService } from './auth.service';
import { type TokenService } from './token.service';
import { type UsersService, type UserAccessContext } from '../users/users.service';
import { type SessionsService } from '../sessions/sessions.service';
import { type PasswordService } from '../../common/crypto/password.service';
import { type AuditService } from '../audit/audit.service';
import { type AppConfigService } from '../../config/app-config.service';
import { type AppLogger } from '@linuxpilot/logger';
import { hashRefreshToken } from '../../common/crypto/token.util';

const activeUser: UserAccessContext = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.com',
  username: 'admin',
  status: USER_STATUSES.ACTIVE,
  passwordHash: 'hash',
  roles: ['super_admin'],
  permissions: ['users.view'],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

function createSession(overrides: Partial<Session> = {}): Session {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    userId: activeUser.id,
    familyId: '22222222-2222-4222-8222-222222222222',
    refreshTokenHash: hashRefreshToken('22222222-2222-4222-8222-222222222222.secret'),
    previousRefreshTokenHash: null,
    refreshVersion: 1,
    rotatedAt: null,
    userAgent: 'vitest',
    ipAddress: '127.0.0.1',
    expiresAt: new Date(1_700_000_060_000),
    revokedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function createService(options: { nowMs?: number; graceMs?: number } = {}) {
  const clock = { now: options.nowMs ?? 1_700_000_000_000 };
  const usersService = {
    findForLogin: jest.fn(),
    getAuthenticatedContext: jest.fn(),
    assertUserCanAuthenticate: jest.fn(),
    toPublicUser: jest.fn((user: UserAccessContext) => ({
      id: user.id,
      email: user.email,
      username: user.username,
      status: user.status,
      roles: user.roles,
      permissions: user.permissions,
      createdAt: user.createdAt.toISOString(),
    })),
    changeStatus: jest.fn(),
    replaceRoles: jest.fn(),
  };
  const sessionsService = {
    create: jest.fn(),
    getById: jest.fn(),
    rotateIfCurrentHash: jest.fn().mockResolvedValue(true),
    hasUsedRefreshHash: jest.fn().mockResolvedValue(false),
    revoke: jest.fn(),
    revokeFamily: jest.fn(),
    revokeAllForUser: jest.fn(),
    listForUser: jest.fn(),
    revokeOwned: jest.fn(),
  };
  const tokenService = {
    createSessionId: jest.fn(() => '22222222-2222-4222-8222-222222222222'),
    signAccessToken: jest.fn(() => 'access-token'),
    createRefreshToken: jest.fn((sessionId: string) => ({
      token: `${sessionId}.rotated`,
      hash: hashRefreshToken(`${sessionId}.rotated`),
    })),
    parseRefreshToken: jest.fn((token: string) => {
      const [sessionId] = token.split('.');
      return { sessionId, hash: hashRefreshToken(token) };
    }),
    getAccessTtlSeconds: jest.fn(() => 900),
    getRefreshTtlMs: jest.fn(() => 30 * 24 * 60 * 60 * 1000),
  };
  const passwordService = {
    verify: jest.fn(),
    verifyDummy: jest.fn(),
  };
  const auditService = {
    record: jest.fn().mockResolvedValue(undefined),
  };
  const config = {
    env: { REFRESH_REUSE_GRACE_MS: options.graceMs ?? 5000 },
    nowMs: () => clock.now,
  };
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

  const service = new AuthService(
    usersService as unknown as UsersService,
    sessionsService as unknown as SessionsService,
    tokenService as unknown as TokenService,
    passwordService as unknown as PasswordService,
    auditService as unknown as AuditService,
    config as unknown as AppConfigService,
    logger as unknown as AppLogger,
  );

  return {
    service,
    usersService,
    sessionsService,
    tokenService,
    passwordService,
    auditService,
    logger,
    clock,
  };
}

describe('AuthService', () => {
  it('logs in an active user', async () => {
    const { service, usersService, passwordService, sessionsService } = createService();
    usersService.findForLogin.mockResolvedValue(activeUser);
    passwordService.verify.mockResolvedValue(true);

    const result = await service.login({
      emailOrUsername: 'admin@example.com',
      password: 'CorrectHorse-Battery9',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.user.email).toBe('admin@example.com');
    expect(sessionsService.create).toHaveBeenCalled();
  });

  it('rejects an incorrect password with a generic error', async () => {
    const { service, usersService, passwordService } = createService();
    usersService.findForLogin.mockResolvedValue(activeUser);
    passwordService.verify.mockResolvedValue(false);

    await expect(
      service.login({ emailOrUsername: 'admin@example.com', password: 'wrong' }),
    ).rejects.toMatchObject({
      code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      message: 'Invalid credentials',
    });
  });

  it('rejects a blocked user', async () => {
    const { service, usersService, passwordService } = createService();
    usersService.findForLogin.mockResolvedValue({ ...activeUser, status: USER_STATUSES.BLOCKED });
    passwordService.verify.mockResolvedValue(true);
    usersService.assertUserCanAuthenticate.mockImplementation(() => {
      throw new AppError(AUTH_ERROR_CODES.ACCOUNT_BLOCKED, 'Account is blocked', 403);
    });

    await expect(
      service.login({ emailOrUsername: 'admin@example.com', password: 'CorrectHorse-Battery9' }),
    ).rejects.toMatchObject({ code: AUTH_ERROR_CODES.ACCOUNT_BLOCKED });
  });

  it('rotates a refresh token', async () => {
    const { service, sessionsService, usersService } = createService();
    const current = '22222222-2222-4222-8222-222222222222.secret';
    sessionsService.getById.mockResolvedValue(createSession());
    usersService.getAuthenticatedContext.mockResolvedValue(activeUser);

    const result = await service.refresh(current);

    expect(result.refreshToken).toBe('22222222-2222-4222-8222-222222222222.rotated');
    expect(sessionsService.rotateIfCurrentHash).toHaveBeenCalled();
  });

  it('returns TOKEN_INVALID for a valid sid and random secret without revoking others', async () => {
    const { service, sessionsService } = createService();
    sessionsService.getById.mockResolvedValue(createSession());

    await expect(
      service.refresh('22222222-2222-4222-8222-222222222222.random-secret'),
    ).rejects.toMatchObject({
      code: AUTH_ERROR_CODES.TOKEN_INVALID,
    });
    expect(sessionsService.revokeAllForUser).not.toHaveBeenCalled();
    expect(sessionsService.revokeFamily).not.toHaveBeenCalled();
  });

  it('treats an unknown sid the same as a wrong secret', async () => {
    const { service, sessionsService } = createService();
    sessionsService.getById.mockResolvedValue(null);

    await expect(
      service.refresh('33333333-3333-4333-8333-333333333333.random-secret'),
    ).rejects.toMatchObject({
      code: AUTH_ERROR_CODES.TOKEN_INVALID,
    });
    expect(sessionsService.revokeFamily).not.toHaveBeenCalled();
  });

  it('revokes only the token family when a rotated token is reused', async () => {
    const { service, sessionsService } = createService();
    const previous = '22222222-2222-4222-8222-222222222222.old-secret';
    sessionsService.getById.mockResolvedValue(
      createSession({
        previousRefreshTokenHash: hashRefreshToken(previous),
        rotatedAt: new Date(1_700_000_000_000 - 60_000),
      }),
    );

    await expect(service.refresh(previous)).rejects.toMatchObject({
      code: AUTH_ERROR_CODES.REFRESH_TOKEN_REUSE,
    });
    expect(sessionsService.revokeFamily).toHaveBeenCalledWith(
      '22222222-2222-4222-8222-222222222222',
    );
    expect(sessionsService.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('does not treat a recent concurrent retry as reuse', async () => {
    const { service, sessionsService, usersService } = createService();
    const current = '22222222-2222-4222-8222-222222222222.secret';
    sessionsService.getById.mockResolvedValue(createSession());
    usersService.getAuthenticatedContext.mockResolvedValue(activeUser);
    sessionsService.rotateIfCurrentHash.mockResolvedValue(false);
    sessionsService.getById.mockResolvedValueOnce(createSession()).mockResolvedValueOnce(
      createSession({
        previousRefreshTokenHash: hashRefreshToken(current),
        rotatedAt: new Date(1_700_000_000_000),
      }),
    );

    await expect(service.refresh(current)).rejects.toMatchObject({
      code: AUTH_ERROR_CODES.TOKEN_INVALID,
    });
    expect(sessionsService.revokeFamily).not.toHaveBeenCalled();
  });

  it('does not rotate again when the previous token is replayed inside the grace window', async () => {
    const { service, sessionsService, clock } = createService({ graceMs: 5000 });
    const previous = '22222222-2222-4222-8222-222222222222.old-secret';
    sessionsService.getById.mockResolvedValue(
      createSession({
        previousRefreshTokenHash: hashRefreshToken(previous),
        rotatedAt: new Date(clock.now - 1_000),
      }),
    );

    await expect(service.refresh(previous)).rejects.toMatchObject({
      code: AUTH_ERROR_CODES.TOKEN_INVALID,
    });
    expect(sessionsService.rotateIfCurrentHash).not.toHaveBeenCalled();
    expect(sessionsService.revokeFamily).not.toHaveBeenCalled();
  });

  it('revokes the family after the grace window when the old token is reused', async () => {
    const { service, sessionsService, clock } = createService({ graceMs: 5000 });
    const previous = '22222222-2222-4222-8222-222222222222.old-secret';
    sessionsService.getById.mockResolvedValue(
      createSession({
        previousRefreshTokenHash: hashRefreshToken(previous),
        rotatedAt: new Date(clock.now - 1_000),
      }),
    );

    clock.now += 6_000;

    await expect(service.refresh(previous)).rejects.toMatchObject({
      code: AUTH_ERROR_CODES.REFRESH_TOKEN_REUSE,
    });
    expect(sessionsService.rotateIfCurrentHash).not.toHaveBeenCalled();
    expect(sessionsService.revokeFamily).toHaveBeenCalledWith(
      '22222222-2222-4222-8222-222222222222',
    );
  });

  it('does not write tokens or hashes to logs', async () => {
    const { service, sessionsService, logger } = createService();
    sessionsService.getById.mockResolvedValue(createSession());

    await expect(
      service.refresh('22222222-2222-4222-8222-222222222222.random-secret'),
    ).rejects.toBeInstanceOf(AppError);

    const logged = JSON.stringify(logger.warn.mock.calls) + JSON.stringify(logger.info.mock.calls);
    expect(logged).not.toContain('random-secret');
    expect(logged).not.toContain(
      hashRefreshToken('22222222-2222-4222-8222-222222222222.random-secret'),
    );
  });

  it('revokes the current session on logout', async () => {
    const { service, sessionsService } = createService();
    const token = '22222222-2222-4222-8222-222222222222.secret';
    sessionsService.getById.mockResolvedValue(createSession());

    await service.logout(token);
    expect(sessionsService.revoke).toHaveBeenCalledWith('22222222-2222-4222-8222-222222222222');
  });

  it('revokes every session on logout-all', async () => {
    const { service, sessionsService } = createService();
    await service.logoutAll(activeUser.id);
    expect(sessionsService.revokeAllForUser).toHaveBeenCalledWith(activeUser.id);
  });
});
