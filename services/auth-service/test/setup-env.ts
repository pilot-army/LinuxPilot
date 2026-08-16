import { existsSync } from 'node:fs';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { generateRsaKeyPair } from '@linuxpilot/config';

config({ path: resolve(__dirname, '../.env.test') });
config({ path: resolve(__dirname, '../../../.env') });

if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

const privateKeyPath = process.env.JWT_ACCESS_PRIVATE_KEY_PATH;
const publicKeyPath = process.env.JWT_ACCESS_PUBLIC_KEY_PATH;
const keyFilesExist = Boolean(
  privateKeyPath && publicKeyPath && existsSync(privateKeyPath) && existsSync(publicKeyPath),
);
if (!keyFilesExist) {
  delete process.env.JWT_ACCESS_PRIVATE_KEY_PATH;
  delete process.env.JWT_ACCESS_PUBLIC_KEY_PATH;
}

if (!process.env.JWT_ACCESS_PRIVATE_KEY) {
  const keys = generateRsaKeyPair();
  process.env.JWT_ACCESS_PRIVATE_KEY = keys.privateKey;
  process.env.JWT_ACCESS_PUBLIC_KEY = keys.publicKey;
}

process.env.JWT_ISSUER ??= 'linuxpilot-auth';
process.env.JWT_AUDIENCE ??= 'linuxpilot-gateway';
process.env.SERVICE_AUTH_SECRET ??= 'test-service-auth-secret-min-32-chars';
process.env.REFRESH_REUSE_GRACE_MS ??= '5000';
