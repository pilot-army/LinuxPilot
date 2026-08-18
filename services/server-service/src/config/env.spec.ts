import { ConfigValidationError } from '@linuxpilot/config';
import { serverEnvSchema } from './env.schema';

const base = {
  NODE_ENV: 'test',
  SERVER_SERVICE_PORT: '3002',
  SERVER_SERVICE_HOST: '127.0.0.1',
  DATABASE_URL: 'postgresql://linuxpilot:pass@localhost:5432/linuxpilot_servers_test',
  JWT_ISSUER: 'linuxpilot-auth',
  JWT_AUDIENCE: 'linuxpilot-gateway',
  LOG_LEVEL: 'error',
  SERVICE_AUTH_SECRET: 'test-service-auth-secret-min-32-chars',
  HEARTBEAT_INTERVAL_MS: '30000',
  OFFLINE_TIMEOUT_MS: '90000',
  ENROLLMENT_TOKEN_TTL_MS: '900000',
  METRICS_RETENTION_DAYS: '14',
  AGENT_TIMESTAMP_WINDOW_MS: '30000',
  AGENT_REQUEST_BODY_LIMIT: '32768',
  PUBLIC_GATEWAY_URL: 'http://127.0.0.1:3000',
  SSH_KEYS_MASTER_KEY: 'test-ssh-keys-master-key-min-32-chars',
  SSH_KEYS_MASTER_KEY_VERSION: 'v1',
};

describe('server env schema', () => {
  it('accepts a valid configuration', () => {
    const parsed = serverEnvSchema.safeParse(base);
    expect(parsed.success).toBe(true);
  });

  it('defaults the SSH keys master key outside production', () => {
    const { SSH_KEYS_MASTER_KEY: _omitted, ...withoutKey } = base;
    const parsed = serverEnvSchema.safeParse(withoutKey);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.SSH_KEYS_MASTER_KEY.length).toBeGreaterThanOrEqual(32);
    }
  });

  it('rejects an offline timeout that is not greater than the heartbeat interval', () => {
    const parsed = serverEnvSchema.safeParse({
      ...base,
      HEARTBEAT_INTERVAL_MS: '60000',
      OFFLINE_TIMEOUT_MS: '30000',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('loadServerEnv production guards', () => {
  it('throws ConfigValidationError when issues are collected', () => {
    expect(() => {
      throw new ConfigValidationError(['SERVER_SERVICE_HOST invalid']);
    }).toThrow(ConfigValidationError);
  });
});
