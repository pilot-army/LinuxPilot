import { AUTH_ERROR_CODES } from '@linuxpilot/auth-contracts';
import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../../api/client';
import { isExpiredSessionCode, mapLoginError } from './auth-errors';

describe('mapLoginError', () => {
  it('uses a neutral key for invalid credentials', () => {
    expect(
      mapLoginError(new ApiRequestError(401, AUTH_ERROR_CODES.INVALID_CREDENTIALS, 'nope')),
    ).toBe('invalidCredentials');
  });

  it('maps blocked, pending, rate-limit, and connectivity failures', () => {
    expect(
      mapLoginError(new ApiRequestError(403, AUTH_ERROR_CODES.ACCOUNT_BLOCKED, 'blocked')),
    ).toBe('accountBlocked');
    expect(
      mapLoginError(new ApiRequestError(403, AUTH_ERROR_CODES.ACCOUNT_PENDING, 'pending')),
    ).toBe('accountPending');
    expect(
      mapLoginError(new ApiRequestError(429, AUTH_ERROR_CODES.RATE_LIMITED, 'slow down')),
    ).toBe('rateLimited');
    expect(mapLoginError(new ApiRequestError(0, 'NETWORK_ERROR', 'offline'))).toBe('network');
    expect(
      mapLoginError(
        new ApiRequestError(502, AUTH_ERROR_CODES.INTERNAL_ERROR, 'Auth service is unavailable'),
      ),
    ).toBe('authUnavailable');
    expect(mapLoginError(new ApiRequestError(503, 'GATEWAY_UNAVAILABLE', 'bad gateway'))).toBe(
      'gatewayUnavailable',
    );
  });

  it('never surfaces unknown backend text', () => {
    expect(mapLoginError(new ApiRequestError(500, 'EXPLODED', 'stack trace here'))).toBe('generic');
    expect(mapLoginError(new Error('ECONNREFUSED 127.0.0.1'))).toBe('generic');
  });
});

describe('isExpiredSessionCode', () => {
  it('detects expired or revoked sessions', () => {
    expect(isExpiredSessionCode(AUTH_ERROR_CODES.SESSION_EXPIRED)).toBe(true);
    expect(isExpiredSessionCode(AUTH_ERROR_CODES.UNAUTHORIZED)).toBe(false);
  });
});
