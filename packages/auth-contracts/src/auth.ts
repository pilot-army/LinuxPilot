import { z } from 'zod';
import { ROLES } from './roles';
import { type TokenPair } from './tokens';
import { USER_STATUSES, type PublicUser } from './user';

const REFRESH_TOKEN_MAX_LENGTH = 256;

export const loginRequestSchema = z.object({
  emailOrUsername: z.string().trim().min(1, 'Email or username is required').max(255),
  password: z.string().min(1, 'Password is required').max(128),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const internalLoginRequestSchema = loginRequestSchema.extend({
  userAgent: z.string().max(512).optional(),
  ipAddress: z.string().max(64).optional(),
});

export type InternalLoginRequest = z.infer<typeof internalLoginRequestSchema>;

export const refreshRequestSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required')
    .max(REFRESH_TOKEN_MAX_LENGTH, 'Refresh token is invalid'),
});

export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

export const logoutRequestSchema = z.object({
  refreshToken: z.string().min(1).max(REFRESH_TOKEN_MAX_LENGTH).optional(),
});

export type LogoutRequest = z.infer<typeof logoutRequestSchema>;

export type LoginResult = TokenPair & {
  user: PublicUser;
};

export type AuthUserResponse = {
  user: PublicUser;
};

export const updateUserStatusSchema = z.object({
  status: z.enum([USER_STATUSES.ACTIVE, USER_STATUSES.BLOCKED, USER_STATUSES.PENDING]),
});

export type UpdateUserStatusRequest = z.infer<typeof updateUserStatusSchema>;

export const updateUserRolesSchema = z.object({
  roles: z.array(z.enum([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OPERATOR, ROLES.VIEWER])).min(1),
});

export type UpdateUserRolesRequest = z.infer<typeof updateUserRolesSchema>;
