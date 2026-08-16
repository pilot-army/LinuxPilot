import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequestId, sanitizeRequestId } from './request-id';

describe('request id', () => {
  it('accepts a well-formed UUID', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    assert.equal(sanitizeRequestId(id), id);
  });

  it('replaces missing, oversized, or control-character values', () => {
    const generated = sanitizeRequestId(undefined);
    assert.match(generated, /^[0-9a-f-]{36}$/);
    assert.notEqual(sanitizeRequestId('not-a-uuid'), 'not-a-uuid');
    assert.notEqual(sanitizeRequestId('a'.repeat(200)), 'a'.repeat(200));
    assert.notEqual(sanitizeRequestId('550e8400-e29b-41d4-a716-446655440000\n'), createRequestId());
  });
});
