import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { AUTH_ERROR_CODES } from '@linuxpilot/auth-contracts';
import { AppError, COOKIE_NAMES, HEADER_NAMES } from '@linuxpilot/common';
import { type Request } from 'express';
import { safeEqual } from '../crypto/safe-equal';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_EXEMPT_PATHS = new Set(['/api/v1/auth/login']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!MUTATING_METHODS.has(request.method.toUpperCase())) {
      return true;
    }
    if (CSRF_EXEMPT_PATHS.has(request.path) || request.path.startsWith('/api/v1/agent')) {
      return true;
    }

    const cookieToken = request.cookies?.[COOKIE_NAMES.csrfToken];
    const headerToken = request.header(HEADER_NAMES.csrfToken);
    if (
      typeof cookieToken !== 'string' ||
      typeof headerToken !== 'string' ||
      !safeEqual(cookieToken, headerToken)
    ) {
      throw new AppError(AUTH_ERROR_CODES.CSRF_REJECTED, 'CSRF token is missing or invalid', 403);
    }

    return true;
  }
}
