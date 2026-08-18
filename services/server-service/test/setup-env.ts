import { existsSync, readFileSync } from 'node:fs';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { generateRsaKeyPair } from '@linuxpilot/config';

config({ path: resolve(__dirname, '../.env.test') });
config({ path: resolve(__dirname, '../../../.env') });

if (process.env.DATABASE_URL_SERVERS_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_SERVERS_TEST;
} else if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST.replace(
    'linuxpilot_auth_test',
    'linuxpilot_servers_test',
  );
}

process.env.NODE_ENV ??= 'test';
process.env.SERVER_SERVICE_PORT ??= '3002';
process.env.SERVER_SERVICE_HOST ??= '127.0.0.1';
process.env.LOG_LEVEL ??= 'error';
process.env.HEARTBEAT_INTERVAL_MS ??= '30000';
process.env.OFFLINE_TIMEOUT_MS ??= '90000';
process.env.ENROLLMENT_TOKEN_TTL_MS ??= '900000';
process.env.METRICS_RETENTION_DAYS ??= '14';
process.env.METRICS_CLEANUP_BATCH_SIZE ??= '50';
process.env.STATUS_SWEEP_INTERVAL_MS ??= '30000';
process.env.AGENT_TIMESTAMP_WINDOW_MS ??= '30000';
process.env.AGENT_REQUEST_BODY_LIMIT ??= '32768';
process.env.PUBLIC_GATEWAY_URL ??= 'http://127.0.0.1:3000';
process.env.SERVICE_AUTH_SECRET ??= 'test-service-auth-secret-min-32-chars';
process.env.JWT_ISSUER ??= 'linuxpilot-auth';
process.env.JWT_AUDIENCE ??= 'linuxpilot-gateway';
process.env.SSH_KEYS_MASTER_KEY ??= 'test-ssh-keys-master-key-min-32-chars';
process.env.SSH_KEYS_MASTER_KEY_VERSION ??= 'v1';

const privateKeyPath = process.env.JWT_ACCESS_PRIVATE_KEY_PATH;
const publicKeyPath = process.env.JWT_ACCESS_PUBLIC_KEY_PATH;
const keyFilesExist = Boolean(
  privateKeyPath && publicKeyPath && existsSync(privateKeyPath) && existsSync(publicKeyPath),
);
if (keyFilesExist && privateKeyPath && publicKeyPath) {
  process.env.JWT_ACCESS_PRIVATE_KEY ??= readFileSync(privateKeyPath, 'utf8');
  process.env.JWT_ACCESS_PUBLIC_KEY ??= readFileSync(publicKeyPath, 'utf8');
}
// Keep PATH keys present but empty so later dotenv/Prisma loads cannot
// reintroduce them alongside the inlined PEMs (resolvePem forbids both).
process.env.JWT_ACCESS_PRIVATE_KEY_PATH = '';
process.env.JWT_ACCESS_PUBLIC_KEY_PATH = '';

if (!process.env.JWT_ACCESS_PUBLIC_KEY || !process.env.JWT_ACCESS_PRIVATE_KEY) {
  const keys = generateRsaKeyPair();
  process.env.JWT_ACCESS_PRIVATE_KEY = keys.privateKey;
  process.env.JWT_ACCESS_PUBLIC_KEY = keys.publicKey;
}
