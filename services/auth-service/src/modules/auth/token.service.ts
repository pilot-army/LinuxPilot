import { Injectable } from '@nestjs/common';
import { AUTH_ERROR_CODES, type TokenPayload } from '@linuxpilot/auth-contracts';
import { AppError, JWT_DEFAULTS, parseDurationToSeconds } from '@linuxpilot/common';
import { sign, verify, type JwtPayload, TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { AppConfigService } from '../../config/app-config.service';
import {
  composeRefreshToken,
  generateRefreshSecret,
  hashRefreshToken,
  parseRefreshToken,
} from '../../common/crypto/token.util';

@Injectable()
export class TokenService {
  constructor(private readonly config: AppConfigService) {}

  createSessionId(): string {
    return randomUUID();
  }

  signAccessToken(payload: TokenPayload): string {
    return sign(payload, this.config.env.JWT_ACCESS_PRIVATE_KEY, {
      algorithm: 'RS256',
      expiresIn: this.config.env.JWT_ACCESS_TTL,
      issuer: this.config.env.JWT_ISSUER,
      audience: this.config.env.JWT_AUDIENCE,
    });
  }

  verifyAccessToken(token: string): TokenPayload {
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

  createRefreshToken(sessionId: string): { token: string; hash: string } {
    const token = composeRefreshToken(sessionId, generateRefreshSecret());
    return { token, hash: hashRefreshToken(token) };
  }

  parseRefreshToken(token: string): { sessionId: string; hash: string } {
    const parsed = parseRefreshToken(token);
    if (!parsed) {
      throw new AppError(AUTH_ERROR_CODES.TOKEN_INVALID, 'Refresh token is invalid', 401);
    }
    return { sessionId: parsed.sessionId, hash: hashRefreshToken(token) };
  }

  getAccessTtlSeconds(): number {
    return parseDurationToSeconds(this.config.env.JWT_ACCESS_TTL);
  }

  getRefreshTtlMs(): number {
    return this.config.env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  }
}

export function isTokenPayload(value: string | JwtPayload): value is TokenPayload & JwtPayload {
  if (typeof value === 'string') {
    return false;
  }
  return (
    typeof value.sub === 'string' &&
    typeof value.sid === 'string' &&
    typeof value.email === 'string' &&
    typeof value.username === 'string' &&
    Array.isArray(value.roles) &&
    value.roles.every((role) => typeof role === 'string') &&
    Array.isArray(value.permissions) &&
    value.permissions.every((permission) => typeof permission === 'string') &&
    (value.iss === undefined || value.iss === JWT_DEFAULTS.issuer || typeof value.iss === 'string')
  );
}
