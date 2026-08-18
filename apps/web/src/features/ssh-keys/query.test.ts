import { describe, expect, it } from 'vitest';
import { defaultSshKeysQuery, parseSshKeysQuery, serializeSshKeysQuery } from './query';

describe('ssh keys query', () => {
  it('round-trips filters through the URL', () => {
    const state = {
      ...defaultSshKeysQuery,
      q: 'SHA256:Ab',
      type: 'private_key' as const,
      algorithm: 'ed25519' as const,
      status: 'active' as const,
      usage: 'used' as const,
      sort: 'name' as const,
      keyId: '11111111-1111-1111-1111-111111111111',
    };
    const parsed = parseSshKeysQuery(serializeSshKeysQuery(state));
    expect(parsed.q).toBe('SHA256:Ab');
    expect(parsed.type).toBe('private_key');
    expect(parsed.algorithm).toBe('ed25519');
    expect(parsed.status).toBe('active');
    expect(parsed.usage).toBe('used');
    expect(parsed.sort).toBe('name');
    expect(parsed.keyId).toBe(state.keyId);
  });
});
