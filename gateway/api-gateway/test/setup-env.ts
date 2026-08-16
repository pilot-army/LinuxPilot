import { generateRsaKeyPair } from '@linuxpilot/config';

const keys = generateRsaKeyPair();

process.env.NODE_ENV ??= 'test';
process.env.GATEWAY_PORT ??= '3000';
process.env.GATEWAY_HOST ??= '127.0.0.1';
process.env.FRONTEND_ORIGIN ??= 'http://localhost:5173';
process.env.AUTH_SERVICE_URL ??= 'http://127.0.0.1:3999';
process.env.AUTH_SERVICE_TIMEOUT_MS ??= '200';
process.env.JWT_ACCESS_PUBLIC_KEY ??= keys.publicKey;
process.env.JWT_ISSUER ??= 'linuxpilot-auth';
process.env.JWT_AUDIENCE ??= 'linuxpilot-gateway';
process.env.JWT_ACCESS_TTL ??= '15m';
process.env.REFRESH_TOKEN_TTL_DAYS ??= '30';
process.env.COOKIE_SECURE ??= 'false';
process.env.TRUST_PROXY ??= 'false';
process.env.LOGIN_RATE_LIMIT ??= '2';
process.env.REFRESH_RATE_LIMIT ??= '2';
process.env.LOGIN_RATE_LIMIT_TTL_MS ??= '60000';
process.env.REFRESH_RATE_LIMIT_TTL_MS ??= '60000';
process.env.RATE_LIMIT_TTL_MS ??= '60000';
process.env.SERVICE_AUTH_SECRET ??= 'test-service-auth-secret-min-32-chars';
process.env.LOG_LEVEL ??= 'silent';

export const testPublicKey = process.env.JWT_ACCESS_PUBLIC_KEY;
