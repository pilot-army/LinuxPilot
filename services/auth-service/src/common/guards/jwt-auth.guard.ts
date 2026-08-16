import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_ERROR_CODES, type AuthenticatedUser } from '@linuxpilot/auth-contracts';
import { AppError } from '@linuxpilot/common';
import { type Request } from 'express';
import { TokenService } from '../../modules/auth/token.service';
import { UsersService } from '../../modules/users/users.service';
import { SessionsService } from '../../modules/sessions/sessions.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request);

    if (isPublic) {
      if (token) {
        await this.attachUser(request, token).catch(() => undefined);
      }
      return true;
    }

    if (!token) {
      throw new AppError(AUTH_ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
    }

    await this.attachUser(request, token);
    return true;
  }

  private async attachUser(request: AuthenticatedRequest, token: string): Promise<void> {
    const payload = this.tokenService.verifyAccessToken(token);
    const user = await this.usersService.getAuthenticatedContext(payload.sub);
    const session = await this.sessionsService.getById(payload.sid);

    if (!session || session.userId !== user.id) {
      throw new AppError(AUTH_ERROR_CODES.SESSION_NOT_FOUND, 'Session is not valid', 401);
    }
    if (session.revokedAt) {
      throw new AppError(AUTH_ERROR_CODES.SESSION_REVOKED, 'Session has been revoked', 401);
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      throw new AppError(AUTH_ERROR_CODES.SESSION_EXPIRED, 'Session has expired', 401);
    }

    request.user = {
      id: user.id,
      sessionId: payload.sid,
      email: user.email,
      username: user.username,
      roles: user.roles,
      permissions: user.permissions,
    };
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
