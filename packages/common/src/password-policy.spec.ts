import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePassword } from './password-policy';

describe('evaluatePassword', () => {
  it('accepts a strong password', () => {
    assert.deepEqual(evaluatePassword('CorrectHorse-Battery9'), []);
  });

  it('rejects a short or simple password', () => {
    const details = evaluatePassword('short');
    assert.ok(details.length > 0);
    assert.ok(details.some((item) => item.includes('at least 12')));
  });
});
