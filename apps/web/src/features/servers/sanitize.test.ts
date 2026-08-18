import { describe, expect, it } from 'vitest';
import { isSensitiveKey, sanitizeRecord, shortenKey } from './sanitize';

describe('server payload sanitization', () => {
  it('drops secrets, signatures, and cookies', () => {
    expect(isSensitiveKey('agentSignature')).toBe(true);
    expect(isSensitiveKey('authorization')).toBe(true);
    expect(sanitizeRecord({
      ok: true,
      token: 'secret',
      cookie: 'sid',
      signature: 'abc',
      count: 2,
    })).toEqual({ ok: true, count: 2 });
  });

  it('shortens idempotency keys without exposing the full value', () => {
    expect(shortenKey('idem-1234567890abcdef')).toBe('idem-1…cdef');
    expect(shortenKey(null)).toBe('—');
  });
});
