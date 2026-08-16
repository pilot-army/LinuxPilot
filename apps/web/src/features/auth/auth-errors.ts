import { AUTH_ERROR_CODES } from '@linuxpilot/auth-contracts';
import { ApiRequestError } from '../../api/client';

export const LOGIN_ERROR_KEYS = [
  'invalidCredentials',
  'accountBlocked',
  'accountPending',
  'rateLimited',
  'network',
  'authUnavailable',
  'gatewayUnavailable',
  'sessionExpired',
  'generic',
  'logoutIncomplete',
  'csrfRejected',
] as const;

export type LoginErrorKey = (typeof LOGIN_ERROR_KEYS)[number];

const EXPIRED_SESSION_CODES = new Set<string>([
  AUTH_ERROR_CODES.SESSION_EXPIRED,
  AUTH_ERROR_CODES.TOKEN_EXPIRED,
  AUTH_ERROR_CODES.SESSION_REVOKED,
  AUTH_ERROR_CODES.REFRESH_TOKEN_REUSE,
]);

export function isExpiredSessionCode(code: string): boolean {
  return EXPIRED_SESSION_CODES.has(code);
}

function isAuthServiceUnavailable(cause: ApiRequestError): boolean {
  return cause.status === 502 && /auth service is unavailable/i.test(cause.message);
}

function isGatewayUnavailable(cause: ApiRequestError): boolean {
  return (
    cause.code === 'GATEWAY_UNAVAILABLE' ||
    cause.status === 503 ||
    cause.status === 504 ||
    (cause.status === 502 && !isAuthServiceUnavailable(cause))
  );
}

export function mapLoginError(cause: unknown): LoginErrorKey {
  if (!(cause instanceof ApiRequestError)) {
    return 'generic';
  }

  if (cause.code === AUTH_ERROR_CODES.INVALID_CREDENTIALS) {
    return 'invalidCredentials';
  }
  if (cause.code === AUTH_ERROR_CODES.ACCOUNT_BLOCKED) {
    return 'accountBlocked';
  }
  if (cause.code === AUTH_ERROR_CODES.ACCOUNT_PENDING) {
    return 'accountPending';
  }
  if (cause.code === AUTH_ERROR_CODES.RATE_LIMITED) {
    return 'rateLimited';
  }
  if (cause.code === 'NETWORK_ERROR' || cause.status === 0) {
    return 'network';
  }
  if (isAuthServiceUnavailable(cause)) {
    return 'authUnavailable';
  }
  if (isGatewayUnavailable(cause)) {
    return 'gatewayUnavailable';
  }

  return 'generic';
}
