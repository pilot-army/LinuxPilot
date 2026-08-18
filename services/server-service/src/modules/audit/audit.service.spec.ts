import { sanitizeMetadata } from './audit.service';

describe('sanitizeMetadata', () => {
  it('strips tokens, signatures, and secrets', () => {
    const clean = sanitizeMetadata({
      serverId: 'abc',
      enrollmentToken: 'should-not-appear',
      token: 'nope',
      signature: 'deadbeef',
      privateKeyPem: '-----BEGIN',
      reason: 'expired',
    });
    expect(clean).toEqual({ serverId: 'abc', reason: 'expired' });
  });
});
