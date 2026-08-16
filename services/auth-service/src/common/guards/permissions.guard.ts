import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AUTH_ERROR_CODES,
  type AuthenticatedUser,
  type PermissionCode,
} from '@linuxpilot/auth-contracts';
import { AppError } from '@linuxpilot/common';
import { type Request } from 'express';
import { ALLOW_AUTHENTICATED_KEY } from '../decorators/allow-authenticated.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const required = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const allowAuthenticated = this.reflector.getAllAndOverride<boolean>(ALLOW_AUTHENTICATED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) {
      throw new AppError(AUTH_ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
    }

    if (required && required.length > 0) {
      const granted = new Set(user.permissions);
      const missing = required.filter((permission) => !granted.has(permission));
      if (missing.length > 0) {
        throw new AppError(AUTH_ERROR_CODES.FORBIDDEN, 'Insufficient permissions', 403);
      }
      return true;
    }

    if (allowAuthenticated) {
      return true;
    }

    throw new AppError(AUTH_ERROR_CODES.FORBIDDEN, 'Insufficient permissions', 403);
  }
}
