import { describe, expect, it } from 'vitest';
import { tokenTtl } from './token-ttl';

describe('tokenTtl', () => {
  it('uses backend expiresAt instead of page-load elapsed time', () => {
    const now = Date.parse('2026-08-16T12:00:00.000Z');
    expect(tokenTtl('2026-08-16T12:14:20.000Z', now)).toEqual({
      expired: false,
      unit: 'minutes',
      count: 14,
    });
    expect(tokenTtl('2026-08-16T12:00:42.000Z', now)).toEqual({
      expired: false,
      unit: 'seconds',
      count: 42,
    });
  });

  it('marks a past or missing expiry as expired', () => {
    const now = Date.parse('2026-08-16T12:00:00.000Z');
    expect(tokenTtl('2026-08-16T11:59:59.000Z', now)).toEqual({ expired: true });
    expect(tokenTtl(null, now)).toEqual({ expired: true });
  });
});
