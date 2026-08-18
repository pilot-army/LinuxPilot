import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const AES_KEY_LENGTH = 32;
const GCM_IV_LENGTH = 12;
const GCM_TAG_LENGTH = 16;

export type EncryptedPrivateKey = {
  ciphertext: Buffer;
  nonce: Buffer;
  wrappedDek: Buffer;
  wrapNonce: Buffer;
  keyVersion: string;
};

export type MasterKeyRing = {
  current: { version: string; secret: string };
  previous?: { version: string; secret: string };
};

export function deriveMasterKey(secret: string, version: string): Buffer {
  return createHash('sha256').update(`linuxpilot-ssh-keys:${version}:${secret}`).digest();
}

export function wipe(buffer: Buffer | undefined | null): void {
  if (buffer && buffer.length > 0) {
    buffer.fill(0);
  }
}

export function encryptPrivateKey(
  plaintext: Buffer,
  ring: MasterKeyRing,
  associatedData: string,
): EncryptedPrivateKey {
  const dek = randomBytes(AES_KEY_LENGTH);
  const nonce = randomBytes(GCM_IV_LENGTH);
  const aad = Buffer.from(associatedData, 'utf8');
  const cipher = createCipheriv('aes-256-gcm', dek, nonce);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);

  const master = deriveMasterKey(ring.current.secret, ring.current.version);
  const wrapNonce = randomBytes(GCM_IV_LENGTH);
  const wrapAad = Buffer.from(`dek:${associatedData}:${ring.current.version}`, 'utf8');
  const wrapCipher = createCipheriv('aes-256-gcm', master, wrapNonce);
  wrapCipher.setAAD(wrapAad);
  const wrappedDek = Buffer.concat([
    wrapCipher.update(dek),
    wrapCipher.final(),
    wrapCipher.getAuthTag(),
  ]);

  wipe(dek);
  wipe(master);
  return {
    ciphertext,
    nonce,
    wrappedDek,
    wrapNonce,
    keyVersion: ring.current.version,
  };
}

export function decryptPrivateKey(
  payload: EncryptedPrivateKey,
  ring: MasterKeyRing,
  associatedData: string,
): Buffer {
  const entry =
    payload.keyVersion === ring.current.version
      ? ring.current
      : payload.keyVersion === ring.previous?.version
        ? ring.previous
        : undefined;
  if (!entry) {
    throw new Error('Unknown SSH key encryption version');
  }

  const master = deriveMasterKey(entry.secret, entry.version);
  const wrapAad = Buffer.from(`dek:${associatedData}:${entry.version}`, 'utf8');
  const wrapped = payload.wrappedDek.subarray(0, payload.wrappedDek.length - GCM_TAG_LENGTH);
  const wrapTag = payload.wrappedDek.subarray(payload.wrappedDek.length - GCM_TAG_LENGTH);
  const wrapDecipher = createDecipheriv('aes-256-gcm', master, payload.wrapNonce);
  wrapDecipher.setAAD(wrapAad);
  wrapDecipher.setAuthTag(wrapTag);
  let dek: Buffer;
  try {
    dek = Buffer.concat([wrapDecipher.update(wrapped), wrapDecipher.final()]);
  } finally {
    wipe(master);
  }

  const aad = Buffer.from(associatedData, 'utf8');
  const body = payload.ciphertext.subarray(0, payload.ciphertext.length - GCM_TAG_LENGTH);
  const tag = payload.ciphertext.subarray(payload.ciphertext.length - GCM_TAG_LENGTH);
  const decipher = createDecipheriv('aes-256-gcm', dek, payload.nonce);
  decipher.setAAD(aad);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(body), decipher.final()]);
  } finally {
    wipe(dek);
  }
}
