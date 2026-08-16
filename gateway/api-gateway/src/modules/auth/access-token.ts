import { AUTH_ERROR_CODES, type TokenPayload } from '@linuxpilot/auth-contracts';
import { AppError, COOKIE_NAMES } from '@linuxpilot/common';
import { type Request } from 'express';
import { JsonWebTokenError, TokenExpiredError, verify, type JwtPayload } from 'jsonwebtoken';

export function readCookie(request: Request, name: string): string | undefined {
  const value = request.cookies?.[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function requireAccessToken(
  request: Request,
  publicKey: string,
  issuer: string,
  audience: string,
): string {
  const token = readCookie(request, COOKIE_NAMES.accessToken);
  if (!token) {
    throw new AppError(AUTH_ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
  }
  verifyAccessToken(token, publicKey, issuer, audience);
  return token;
}

export function verifyAccessToken(
  token: string,
  publicKey: string,
  issuer: string,
  audience: string,
): TokenPayload {
  try {
    const decoded = verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer,
      audience,
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
