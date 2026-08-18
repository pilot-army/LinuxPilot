import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AUTH_ERROR_CODES,
  type AuthenticatedUser,
  type TokenPayload,
} from '@linuxpilot/auth-contracts';
import { AppError } from '@linuxpilot/common';
import { type Request } from 'express';
import { JsonWebTokenError, TokenExpiredError, verify, type JwtPayload } from 'jsonwebtoken';
import { AppConfigService } from '../../config/app-config.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: AppConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request);

    if (isPublic) {
      return true;
    }

    if (!token) {
      throw new AppError(AUTH_ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
    }

    request.user = toAuthenticatedUser(this.verifyAccessToken(token));
    return true;
  }

  private verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = verify(token, this.config.env.JWT_ACCESS_PUBLIC_KEY, {
        algorithms: ['RS256'],
        issuer: this.config.env.JWT_ISSUER,
        audience: this.config.env.JWT_AUDIENCE,
      });
      if (!isTokenPayload(decoded)) {
        throw new AppError(AUTH_ERROR_CODES.TOKEN_INVALID, 'Access token is invalid', 401);
      }
      return decoded;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new AppError(AUTH_ERROR_CODES.TOKEN_EXPIRED, 'Access token has expired', 401);
      }
      if (error instanceof JsonWebTokenError) {
        throw new AppError(AUTH_ERROR_CODES.TOKEN_INVALID, 'Access token is invalid', 401);
      }
      throw error;
    }
  }
}

function extractBearerToken(request: Request): string | null {
  const header = request.headers.authorization;
  if (!header) {
    return null;
  }
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }
  return token;
}

function toAuthenticatedUser(payload: TokenPayload): AuthenticatedUser {
  return {
    id: payload.sub,
    sessionId: payload.sid,
    email: payload.email,
    username: payload.username,
    roles: payload.roles,
    permissions: payload.permissions,
  };
}

function isTokenPayload(value: string | JwtPayload): value is TokenPayload & JwtPayload {
  return (
    typeof value !== 'string' &&
    typeof value.sub === 'string' &&
    typeof value.sid === 'string' &&
    typeof value.email === 'string' &&
    typeof value.username === 'string' &&
    Array.isArray(value.roles) &&
    Array.isArray(value.permissions)
  );
}
