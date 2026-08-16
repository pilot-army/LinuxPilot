import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { HEADER_NAMES } from './constants';

export type ServiceAuthHeaders = {
  timestamp: string;
  nonce: string;
  signature: string;
};

export type ServiceAuthBody = string | Buffer | Uint8Array;

/**
 * Canonical string:
 * timestamp \n nonce \n METHOD \n path?query \n sha256(exact body bytes)
 */
export function buildServiceAuthCanonical(
  method: string,
  pathAndQuery: string,
  timestamp: string,
  nonce: string,
  body: ServiceAuthBody = '',
): string {
  const target = normalizeServiceAuthTarget(pathAndQuery);
  const bodyHash = hashServiceAuthBody(body);
  return `${timestamp}\n${nonce}\n${method.toUpperCase()}\n${target}\n${bodyHash}`;
}

export function hashServiceAuthBody(body: ServiceAuthBody = ''): string {
  return createHash('sha256').update(body).digest('hex');
}

export function normalizeServiceAuthTarget(pathAndQuery: string): string {
  if (!pathAndQuery.startsWith('/')) {
    throw new Error('Service auth path must start with /');
  }
  // eslint-disable-next-line no-control-regex -- reject ASCII controls in signed paths
  if (/[\u0000-\u001F\u007F]/.test(pathAndQuery)) {
    throw new Error('Service auth path contains control characters');
  }
  const withoutHash = pathAndQuery.split('#')[0] ?? pathAndQuery;
  return withoutHash;
}

export function serviceAuthTargetFromRequest(pathname: string, originalUrl: string): string {
  const queryIndex = originalUrl.indexOf('?');
  const query = queryIndex === -1 ? '' : (originalUrl.slice(queryIndex).split('#')[0] ?? '');
  return normalizeServiceAuthTarget(`${pathname}${query}`);
}

export function signServiceRequest(
  secret: string,
  method: string,
  pathAndQuery: string,
  body: ServiceAuthBody = '',
  now = Date.now(),
): ServiceAuthHeaders {
  const timestamp = String(now);
  const nonce = randomBytes(16).toString('hex');
  const canonical = buildServiceAuthCanonical(method, pathAndQuery, timestamp, nonce, body);
  const signature = createHmac('sha256', secret).update(canonical).digest('hex');
  return { timestamp, nonce, signature };
}

export function serviceAuthHeaderRecord(headers: ServiceAuthHeaders): Record<string, string> {
  return {
    [HEADER_NAMES.serviceTimestamp]: headers.timestamp,
    [HEADER_NAMES.serviceNonce]: headers.nonce,
    [HEADER_NAMES.serviceSignature]: headers.signature,
  };
}

export function verifyServiceSignature(
  secrets: string[],
  method: string,
  pathAndQuery: string,
  timestamp: string,
  nonce: string,
  signature: string,
  body: ServiceAuthBody = '',
): boolean {
  const canonical = buildServiceAuthCanonical(method, pathAndQuery, timestamp, nonce, body);
  return secrets.some((secret) => {
    const expected = createHmac('sha256', secret).update(canonical).digest('hex');
    return safeEqualHex(expected, signature);
  });
}

function safeEqualHex(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}
