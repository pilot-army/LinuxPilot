import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidIp, parseForwardedFor, sanitizeIpAddress } from './ip';

describe('ip helpers', () => {
  it('accepts IPv4 and IPv6', () => {
    assert.equal(isValidIp('127.0.0.1'), true);
    assert.equal(isValidIp('2001:db8::1'), true);
    assert.equal(isValidIp('not-an-ip'), false);
    assert.equal(isValidIp('999.1.1.1'), false);
  });

  it('takes the first valid forwarded address and rejects junk', () => {
    assert.equal(parseForwardedFor('203.0.113.10, 10.0.0.1'), '203.0.113.10');
    assert.equal(parseForwardedFor('nope, 10.0.0.1'), undefined);
    assert.equal(parseForwardedFor('203.0.113.10\n'), undefined);
    assert.equal(sanitizeIpAddress(' 10.1.2.3 '), '10.1.2.3');
  });
});
