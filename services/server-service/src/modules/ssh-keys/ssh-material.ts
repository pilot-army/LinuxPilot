import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  type KeyObject,
} from 'node:crypto';
import {
  RSA_MIN_BITS,
  RSA_RECOMMENDED_BITS,
  SERVER_ERROR_CODES,
  SSH_KEY_ALGORITHMS,
  type SshKeyAlgorithm,
} from '@linuxpilot/server-contracts';
import { AppError } from '@linuxpilot/common';

const PUBLIC_ALGORITHMS = new Set([
  'ssh-ed25519',
  'ssh-rsa',
  'ecdsa-sha2-nistp256',
  'ecdsa-sha2-nistp384',
  'ecdsa-sha2-nistp521',
]);

export type ParsedSshMaterial = {
  algorithm: SshKeyAlgorithm;
  keySize: number | null;
  fingerprint: string;
  publicKey: string;
  encrypted: boolean;
  hasPrivateKey: boolean;
  hasPublicKey: boolean;
  privateKeyPem?: string;
};

export function looksLikeSshKeyMaterial(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.startsWith('-----BEGIN ') && trimmed.includes('KEY-----')) {
    return true;
  }
  const token = trimmed.split(/\s+/)[0] ?? '';
  return PUBLIC_ALGORITHMS.has(token) || token === 'ssh-dss';
}

export function inspectSshMaterial(input: {
  privateKey?: string;
  publicKey?: string;
  passphrase?: string;
}): ParsedSshMaterial {
  if (input.privateKey) {
    return parsePrivateKey(input.privateKey, input.passphrase);
  }
  if (input.publicKey) {
    return parsePublicKey(input.publicKey);
  }
  throw invalid('A public or private key is required');
}

export function generateSshMaterial(input: {
  algorithm: SshKeyAlgorithm;
  rsaBits?: number;
  comment?: string;
}): ParsedSshMaterial {
  if (input.algorithm === SSH_KEY_ALGORITHMS.RSA) {
    const bits = input.rsaBits ?? RSA_RECOMMENDED_BITS;
    if (bits < RSA_MIN_BITS) {
      throw unsupported('RSA keys must be at least 3072 bits');
    }
    const pair = generateKeyPairSync('rsa', { modulusLength: bits });
    return fromPrivateKeyObject(pair.privateKey, false, sanitizeComment(input.comment));
  }
  if (input.algorithm === SSH_KEY_ALGORITHMS.ECDSA) {
    const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    return fromPrivateKeyObject(pair.privateKey, false, sanitizeComment(input.comment));
  }
  const pair = generateKeyPairSync('ed25519');
  return fromPrivateKeyObject(pair.privateKey, false, sanitizeComment(input.comment));
}

function parsePrivateKey(material: string, passphrase?: string): ParsedSshMaterial {
  if (!looksLikeSshKeyMaterial(material)) {
    throw invalid('Unsupported private key format');
  }
  const encrypted = isEncryptedPrivateKey(material);
  try {
    const key = createPrivateKey({
      key: material,
      passphrase: passphrase || undefined,
    });
    return fromPrivateKeyObject(key, encrypted, undefined);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    if (encrypted && !passphrase) {
      throw new AppError(
        SERVER_ERROR_CODES.SSH_KEY_PASSPHRASE,
        'Passphrase is required for this encrypted key',
        400,
      );
    }
    if (/passphrase|bad decrypt|mac check/i.test(message)) {
      throw new AppError(SERVER_ERROR_CODES.SSH_KEY_PASSPHRASE, 'Incorrect passphrase', 400);
    }
    throw invalid('The private key is damaged or uses an unsupported format');
  }
}

function parsePublicKey(material: string): ParsedSshMaterial {
  const trimmed = material.trim();
  if (!looksLikeSshKeyMaterial(trimmed)) {
    throw invalid('Unsupported public key format');
  }
  const [alg, blob] = trimmed.split(/\s+/);
  if (alg === 'ssh-dss') {
    throw unsupported('DSA keys are not supported');
  }
  if (!alg || !blob || !PUBLIC_ALGORITHMS.has(alg)) {
    throw invalid('Unsupported public key algorithm');
  }
  const decoded = Buffer.from(blob, 'base64');
  if (decoded.length < 20) {
    throw invalid('The public key is damaged');
  }
  const algorithm = algorithmFromOpenSsh(alg);
  const comment = sanitizeComment(trimmed.split(/\s+/).slice(2).join(' '));
  const publicKey = `${alg} ${blob}${comment ? ` ${comment}` : ''}`;
  return {
    algorithm,
    keySize: keySizeFromPublic(algorithm, decoded),
    fingerprint: fingerprintOf(decoded),
    publicKey,
    encrypted: false,
    hasPrivateKey: false,
    hasPublicKey: true,
  };
}

function fromPrivateKeyObject(
  key: KeyObject,
  encrypted: boolean,
  comment?: string,
): ParsedSshMaterial {
  if (key.asymmetricKeyType === 'dsa') {
    throw unsupported('DSA keys are not supported');
  }
  const publicKey = createPublicKey(key);
  const encoded = encodeOpenSshPublic(publicKey, comment);
  const algorithm = algorithmFromKeyType(publicKey.asymmetricKeyType);
  const keySize = keySizeFromKey(publicKey);
  if (algorithm === SSH_KEY_ALGORITHMS.RSA && (keySize ?? 0) < RSA_MIN_BITS) {
    throw unsupported('RSA keys must be at least 3072 bits');
  }
  const pem = key.export({ type: 'pkcs8', format: 'pem' }).toString();
  return {
    algorithm,
    keySize,
    fingerprint: encoded.fingerprint,
    publicKey: encoded.line,
    encrypted,
    hasPrivateKey: true,
    hasPublicKey: true,
    privateKeyPem: pem,
  };
}

export function encodeOpenSshPublic(
  publicKey: KeyObject,
  comment?: string,
): { line: string; fingerprint: string; algorithm: string } {
  const type = publicKey.asymmetricKeyType;
  const jwk = publicKey.export({ format: 'jwk' });
  let alg: string;
  let blob: Buffer;
  if (type === 'ed25519') {
    alg = 'ssh-ed25519';
    blob = Buffer.concat([sshString('ssh-ed25519'), sshString(base64urlToBuffer(jwk.x ?? ''))]);
  } else if (type === 'rsa') {
    alg = 'ssh-rsa';
    blob = Buffer.concat([
      sshString('ssh-rsa'),
      sshMpint(base64urlToBuffer(jwk.e ?? '')),
      sshMpint(base64urlToBuffer(jwk.n ?? '')),
    ]);
  } else if (type === 'ec') {
    const curve = namedCurveToOpenSsh(jwk.crv);
    alg = `ecdsa-sha2-${curve}`;
    const point = Buffer.concat([
      Buffer.from([0x04]),
      base64urlToBuffer(jwk.x ?? ''),
      base64urlToBuffer(jwk.y ?? ''),
    ]);
    blob = Buffer.concat([sshString(alg), sshString(curve), sshString(point)]);
  } else if (type === 'dsa') {
    throw unsupported('DSA keys are not supported');
  } else {
    throw unsupported('Unsupported key algorithm');
  }
  const safeComment = sanitizeComment(comment);
  return {
    algorithm: alg,
    fingerprint: fingerprintOf(blob),
    line: `${alg} ${blob.toString('base64')}${safeComment ? ` ${safeComment}` : ''}`,
  };
}

function keySizeFromKey(key: KeyObject): number | null {
  const details = key.asymmetricKeyDetails;
  if (key.asymmetricKeyType === 'rsa') {
    return details?.modulusLength ?? null;
  }
  if (key.asymmetricKeyType === 'ec') {
    const curve = details?.namedCurve;
    if (curve === 'prime256v1' || curve === 'P-256') {
      return 256;
    }
    if (curve === 'secp384r1' || curve === 'P-384') {
      return 384;
    }
    if (curve === 'secp521r1' || curve === 'P-521') {
      return 521;
    }
  }
  if (key.asymmetricKeyType === 'ed25519') {
    return 256;
  }
  return null;
}

function keySizeFromPublic(algorithm: SshKeyAlgorithm, blob: Buffer): number | null {
  if (algorithm === SSH_KEY_ALGORITHMS.ED25519) {
    return 256;
  }
  if (algorithm === SSH_KEY_ALGORITHMS.ECDSA) {
    if (blob.includes(Buffer.from('nistp384'))) {
      return 384;
    }
    if (blob.includes(Buffer.from('nistp521'))) {
      return 521;
    }
    return 256;
  }
  return null;
}

function algorithmFromKeyType(type: string | undefined): SshKeyAlgorithm {
  if (type === 'ed25519') {
    return SSH_KEY_ALGORITHMS.ED25519;
  }
  if (type === 'rsa') {
    return SSH_KEY_ALGORITHMS.RSA;
  }
  if (type === 'ec') {
    return SSH_KEY_ALGORITHMS.ECDSA;
  }
  throw unsupported('Unsupported key algorithm');
}

function algorithmFromOpenSsh(alg: string): SshKeyAlgorithm {
  if (alg === 'ssh-ed25519') {
    return SSH_KEY_ALGORITHMS.ED25519;
  }
  if (alg === 'ssh-rsa') {
    return SSH_KEY_ALGORITHMS.RSA;
  }
  if (alg.startsWith('ecdsa-sha2-')) {
    return SSH_KEY_ALGORITHMS.ECDSA;
  }
  throw unsupported('Unsupported public key algorithm');
}

function namedCurveToOpenSsh(curve: string | undefined): string {
  if (curve === 'P-256') {
    return 'nistp256';
  }
  if (curve === 'P-384') {
    return 'nistp384';
  }
  if (curve === 'P-521') {
    return 'nistp521';
  }
  throw unsupported('Unsupported ECDSA curve');
}

function isEncryptedPrivateKey(material: string): boolean {
  return (
    /BEGIN ENCRYPTED PRIVATE KEY/i.test(material) ||
    /Proc-Type:\s*4,ENCRYPTED/i.test(material) ||
    /DEK-Info:/i.test(material) ||
    /bcrypt/i.test(material)
  );
}

function fingerprintOf(blob: Buffer): string {
  return `SHA256:${createHash('sha256').update(blob).digest('base64').replace(/=+$/g, '')}`;
}

function sshString(value: string | Buffer): Buffer {
  const data = typeof value === 'string' ? Buffer.from(value, 'utf8') : value;
  const out = Buffer.alloc(4 + data.length);
  out.writeUInt32BE(data.length, 0);
  data.copy(out, 4);
  return out;
}

function sshMpint(value: Buffer): Buffer {
  let buf = value;
  while (buf.length > 1 && buf[0] === 0) {
    buf = buf.subarray(1);
  }
  const leading = buf[0];
  if (leading !== undefined && (leading & 0x80) !== 0) {
    buf = Buffer.concat([Buffer.from([0]), buf]);
  }
  return sshString(buf);
}

function base64urlToBuffer(value: string): Buffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return Buffer.from(`${padded}${pad}`, 'base64');
}

function sanitizeComment(value: string | undefined): string {
  if (!value) {
    return '';
  }
  return value
    .replace(/[\u0000-\u001F\u007F<>&"'`]/g, '') // eslint-disable-line no-control-regex
    .trim()
    .slice(0, 80);
}

function invalid(message: string): AppError {
  return new AppError(SERVER_ERROR_CODES.SSH_KEY_INVALID, message, 400);
}

function unsupported(message: string): AppError {
  return new AppError(SERVER_ERROR_CODES.SSH_KEY_UNSUPPORTED, message, 400);
}
