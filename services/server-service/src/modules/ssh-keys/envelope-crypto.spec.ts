import { decryptPrivateKey, encryptPrivateKey, wipe } from './envelope-crypto';

const ring = {
  current: { version: 'v1', secret: 'test-ssh-keys-master-key-min-32-chars' },
};

describe('envelope-crypto', () => {
  it('round-trips a private key with tenant-bound AAD', () => {
    const plaintext = Buffer.from('-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----');
    const sealed = encryptPrivateKey(plaintext, ring, 'ssh-key:abc');
    const opened = decryptPrivateKey(sealed, ring, 'ssh-key:abc');
    expect(opened.toString()).toBe(plaintext.toString());
    expect(sealed.ciphertext.includes(plaintext)).toBe(false);
  });

  it('rejects decryption with a different associated data', () => {
    const plaintext = Buffer.from('private-material');
    const sealed = encryptPrivateKey(plaintext, ring, 'ssh-key:abc');
    expect(() => decryptPrivateKey(sealed, ring, 'ssh-key:other')).toThrow();
  });

  it('wipes buffer contents', () => {
    const buffer = Buffer.from('abc');
    wipe(buffer);
    expect(buffer.equals(Buffer.from([0, 0, 0]))).toBe(true);
  });
});
