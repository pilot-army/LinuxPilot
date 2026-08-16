import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const REFRESH_SECRET_BYTES = 32;

export function generateRefreshSecret(): string {
  return randomBytes(REFRESH_SECRET_BYTES).toString('base64url');
}

export function composeRefreshToken(sessionId: string, secret: string): string {
  return `${sessionId}.${secret}`;
}

export function parseRefreshToken(token: string): { sessionId: string; secret: string } | null {
  const separator = token.indexOf('.');
  if (separator <= 0 || separator === token.length - 1) {
    return null;
  }

  const sessionId = token.slice(0, separator);
  const secret = token.slice(separator + 1);
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(sessionId) || secret.length < 16) {
    return null;
  }

  return { sessionId, secret };
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}
