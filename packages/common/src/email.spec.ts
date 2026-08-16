import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  looksLikeEmail,
  normalizeEmail,
  normalizeUsername,
  canonicalizeUsername,
  tryNormalizeUsername,
  UsernameValidationError,
} from './email';

describe('email helpers', () => {
  it('normalizes email by trimming and lowercasing', () => {
    assert.equal(normalizeEmail('  Admin@Example.COM '), 'admin@example.com');
  });

  it('detects email-shaped identifiers', () => {
    assert.equal(looksLikeEmail('admin@example.com'), true);
    assert.equal(looksLikeEmail('admin'), false);
  });
});

describe('username helpers', () => {
  it('canonicalizes display form and lowercases the unique form', () => {
    assert.equal(canonicalizeUsername('  Pilot '), 'Pilot');
    assert.equal(normalizeUsername('  Pilot '), 'pilot');
    assert.equal(normalizeUsername('ADMIN'), 'admin');
  });

  it('treats case variants as the same identity', () => {
    assert.equal(normalizeUsername('Admin'), normalizeUsername('admin'));
    assert.equal(normalizeUsername('Адмін'), normalizeUsername('адмін'));
  });

  it('rejects internal whitespace and control characters', () => {
    assert.throws(() => normalizeUsername('pi lot'), UsernameValidationError);
    assert.throws(() => normalizeUsername('pi\nlot'), UsernameValidationError);
    assert.throws(() => normalizeUsername('pilot\u0000x'), UsernameValidationError);
  });

  it('applies NFC without compatibility folding', () => {
    const composed = 'caféuser';
    const decomposed = 'cafe\u0301user';
    assert.equal(canonicalizeUsername(decomposed), composed);
    assert.notEqual('ﬁ'.normalize('NFKC'), 'ﬁ'.normalize('NFC'));
    assert.equal(normalizeUsername('ﬁuser'), 'ﬁuser');
    assert.notEqual(normalizeUsername('ﬁuser'), 'fiuser');
  });

  it('returns null for invalid usernames instead of throwing', () => {
    assert.equal(tryNormalizeUsername('ab'), null);
    assert.equal(tryNormalizeUsername('valid_user'), 'valid_user');
  });
});
