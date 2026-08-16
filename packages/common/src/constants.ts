export const COOKIE_NAMES = {
  accessToken: 'lp_access_token',
  refreshToken: 'lp_refresh_token',
  csrfToken: 'lp_csrf_token',
} as const;

export const HEADER_NAMES = {
  requestId: 'x-request-id',
  csrfToken: 'x-csrf-token',
  forwardedFor: 'x-forwarded-for',
  serviceTimestamp: 'x-lp-service-timestamp',
  serviceNonce: 'x-lp-service-nonce',
  serviceSignature: 'x-lp-service-signature',
} as const;

export const JWT_DEFAULTS = {
  issuer: 'linuxpilot-auth',
  audience: 'linuxpilot-gateway',
  algorithm: 'RS256',
} as const;

export const REFRESH_TOKEN_MAX_LENGTH = 256;
export const REQUEST_ID_MAX_LENGTH = 128;
export const REQUEST_BODY_LIMIT = '32kb';
