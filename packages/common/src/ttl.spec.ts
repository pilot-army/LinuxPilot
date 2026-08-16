import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { daysToMs, parseDurationToMs, parseDurationToSeconds } from './ttl';

describe('ttl helpers', () => {
  it('parses compact duration strings', () => {
    assert.equal(parseDurationToSeconds('15m'), 900);
    assert.equal(parseDurationToSeconds('1h'), 3600);
    assert.equal(parseDurationToMs('30s'), 30_000);
    assert.equal(daysToMs(30), 30 * 24 * 60 * 60 * 1000);
  });

  it('rejects invalid durations', () => {
    assert.throws(() => parseDurationToSeconds('15'));
    assert.throws(() => parseDurationToSeconds('abc'));
  });
});
