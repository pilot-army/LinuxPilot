const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_REQUEST_ID_LENGTH = 128;
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/; // eslint-disable-line no-control-regex

export function createRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('crypto.randomUUID is not available');
  }
  return globalThis.crypto.randomUUID();
}

export function sanitizeRequestId(value: string | undefined): string {
  if (!value) {
    return createRequestId();
  }

  const trimmed = value.trim();
  if (
    trimmed.length === 0 ||
    trimmed.length > MAX_REQUEST_ID_LENGTH ||
    CONTROL_CHARS.test(trimmed) ||
    !UUID_PATTERN.test(trimmed)
  ) {
    return createRequestId();
  }

  return trimmed.toLowerCase();
}
