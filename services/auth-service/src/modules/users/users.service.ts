import { Injectable } from '@nestjs/common';
import {
  AUTH_ERROR_CODES,
  USER_STATUSES,
  type PublicUser,
  type RoleName,
  type UserStatus,
} from '@linuxpilot/auth-contracts';
import {
  AppError,
  canonicalizeUsername,
  looksLikeEmail,
  normalizeEmail,
  tryNormalizeUsername,
} from '@linuxpilot/common';
import { RolesService } from '../roles/roles.service';
import { SessionsService } from '../sessions/sessions.service';
import { UsersRepository, type UserWithAccess } from './users.repository';

export type UserAccessContext = {
  id: string;
  email: string;
  username: string;
  status: PublicUser['status'];
  passwordHash: string;
  roles: string[];
  permissions: string[];
  createdAt: Date;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly sessionsService: SessionsService,
    private readonly rolesService: RolesService,
  ) {}

  async findForLogin(emailOrUsername: string): Promise<UserAccessContext | null> {
    if (looksLikeEmail(emailOrUsername)) {
      const user = await this.usersRepository.findByEmailWithAccess(
        normalizeEmail(emailOrUsername),
      );
      return user ? toAccessContext(user) : null;
    }

    const normalized = tryNormalizeUsername(emailOrUsername);
    if (!normalized) {
      return null;
    }

    const user = await this.usersRepository.findByUsernameNormalizedWithAccess(normalized);
    return user ? toAccessContext(user) : null;
  }

  async getAuthenticatedContext(userId: string): Promise<UserAccessContext> {
    const user = await this.usersRepository.findByIdWithAccess(userId);
    if (!user) {
      throw new AppError(AUTH_ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
    }
    this.assertUserCanAuthenticate(user.status);
    return toAccessContext(user);
  }

  assertUserCanAuthenticate(status: UserStatus): void {
    if (status === USER_STATUSES.BLOCKED) {
      throw new AppError(AUTH_ERROR_CODES.ACCOUNT_BLOCKED, 'Account is blocked', 403);
    }
    if (status === USER_STATUSES.PENDING) {
      throw new AppError(AUTH_ERROR_CODES.ACCOUNT_PENDING, 'Account is pending activation', 403);
    }
  }

  async changeStatus(userId: string, status: UserStatus): Promise<PublicUser> {
    const existing = await this.usersRepository.findByIdWithAccess(userId);
    if (!existing) {
      throw new AppError(AUTH_ERROR_CODES.SESSION_NOT_FOUND, 'User not found', 404);
    }

    const updated = await this.usersRepository.updateStatus(userId, status);
    if (status === USER_STATUSES.BLOCKED || status === USER_STATUSES.PENDING) {
      await this.sessionsService.revokeAllForUser(userId);
    }

    const withAccess = await this.usersRepository.findByIdWithAccess(updated.id);
    if (!withAccess) {
      throw new AppError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'User update failed', 500);
    }
    return this.toPublicUser(toAccessContext(withAccess));
  }

  async replaceRoles(userId: string, roles: RoleName[]): Promise<PublicUser> {
    const existing = await this.usersRepository.findById(userId);
    if (!existing) {
      throw new AppError(AUTH_ERROR_CODES.SESSION_NOT_FOUND, 'User not found', 404);
    }

    const roleRows = await Promise.all(roles.map((name) => this.rolesService.requireByName(name)));
    await this.usersRepository.replaceRoles(
      userId,
      roleRows.map((role) => role.id),
    );

    const withAccess = await this.usersRepository.findByIdWithAccess(userId);
    if (!withAccess) {
      throw new AppError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'User update failed', 500);
    }
    return this.toPublicUser(toAccessContext(withAccess));
  }

  toPublicUser(user: UserAccessContext): PublicUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      status: user.status,
      roles: user.roles,
      permissions: user.permissions,
      createdAt: user.createdAt.toISOString(),
    };
  }

  displayUsername(username: string): string {
    return canonicalizeUsername(username);
  }
}

function toAccessContext(user: UserWithAccess): UserAccessContext {
  const roles = user.roles.map((assignment) => assignment.role.name);
  const permissions = [
    ...new Set(
      user.roles.flatMap((assignment) =>
        assignment.role.permissions.map((item) => item.permission.code),
      ),
    ),
  ];

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    status: user.status,
    passwordHash: user.passwordHash,
    roles,
    permissions,
    createdAt: user.createdAt,
  };
}
