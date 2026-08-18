import { generateKeyPairSync } from 'node:crypto';
import { SERVER_ERROR_CODES } from '@linuxpilot/server-contracts';
import { AppError } from '@linuxpilot/common';
import { generateSshMaterial, inspectSshMaterial, looksLikeSshKeyMaterial } from './ssh-material';

describe('ssh-material', () => {
  it('generates an Ed25519 key with a SHA256 fingerprint and never uses DSA', () => {
    const generated = generateSshMaterial({ algorithm: 'ed25519', comment: 'linuxpilot' });
    expect(generated.algorithm).toBe('ed25519');
    expect(generated.fingerprint.startsWith('SHA256:')).toBe(true);
    expect(generated.publicKey.startsWith('ssh-ed25519 ')).toBe(true);
    expect(generated.hasPrivateKey).toBe(true);
    expect(generated.privateKeyPem).toContain('BEGIN PRIVATE KEY');
  });

  it('generates RSA 4096 and rejects weak RSA', () => {
    const generated = generateSshMaterial({ algorithm: 'rsa', rsaBits: 4096 });
    expect(generated.algorithm).toBe('rsa');
    expect(generated.keySize).toBe(4096);
    expect(() => generateSshMaterial({ algorithm: 'rsa', rsaBits: 2048 })).toThrow(AppError);
  });

  it('rejects DSA public keys and random files', () => {
    expect(looksLikeSshKeyMaterial('ssh-dss AAAA comment')).toBe(true);
    expect(() => inspectSshMaterial({ publicKey: 'ssh-dss AAAA comment' })).toThrow(
      expect.objectContaining({ code: SERVER_ERROR_CODES.SSH_KEY_UNSUPPORTED }),
    );
    expect(looksLikeSshKeyMaterial('not-a-key')).toBe(false);
    expect(() => inspectSshMaterial({ publicKey: 'not-a-key' })).toThrow(AppError);
  });

  it('parses a generated public key and matches the fingerprint', () => {
    const generated = generateSshMaterial({ algorithm: 'ed25519' });
    const inspected = inspectSshMaterial({ publicKey: generated.publicKey });
    expect(inspected.fingerprint).toBe(generated.fingerprint);
    expect(inspected.hasPrivateKey).toBe(false);
  });

  it('parses an unencrypted PKCS#8 private key', () => {
    const { privateKey } = generateKeyPairSync('ed25519');
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const parsed = inspectSshMaterial({ privateKey: pem });
    expect(parsed.algorithm).toBe('ed25519');
    expect(parsed.fingerprint.startsWith('SHA256:')).toBe(true);
  });
});
