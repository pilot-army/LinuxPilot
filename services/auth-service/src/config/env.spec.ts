import { generateRsaKeyPair } from '@linuxpilot/config';
import { ConfigValidationError } from '@linuxpilot/config';
import { loadAuthEnv } from './env';

const keys = generateRsaKeyPair();

const validEnv: NodeJS.ProcessEnv = {
  NODE_ENV: 'test',
  AUTH_SERVICE_PORT: '3001',
  AUTH_SERVICE_HOST: '0.0.0.0',
  DATABASE_URL: 'postgresql://linuxpilot:secret@localhost:5432/linuxpilot_auth',
  JWT_ACCESS_PRIVATE_KEY: keys.privateKey,
  JWT_ACCESS_PUBLIC_KEY: keys.publicKey,
  JWT_ACCESS_TTL: '15m',
  JWT_ISSUER: 'linuxpilot-auth',
  JWT_AUDIENCE: 'linuxpilot-gateway',
  REFRESH_TOKEN_TTL_DAYS: '30',
  ARGON2_MEMORY_COST: '4096',
  ARGON2_TIME_COST: '2',
  ARGON2_PARALLELISM: '1',
  LOG_LEVEL: 'silent',
  SERVICE_AUTH_SECRET: 'abcdefghijklmnopqrstuvwxyz123456',
};

describe('loadAuthEnv', () => {
  it('parses a complete environment', () => {
    const config = loadAuthEnv(validEnv);
    expect(config.AUTH_SERVICE_PORT).toBe(3001);
    expect(config.REFRESH_TOKEN_TTL_DAYS).toBe(30);
    expect(config.JWT_ACCESS_PRIVATE_KEY).toContain('BEGIN');
  });

  it('fails when a required variable is missing', () => {
    const { SERVICE_AUTH_SECRET: _omitted, ...incomplete } = validEnv;
    expect(() => loadAuthEnv(incomplete)).toThrow(ConfigValidationError);
    expect(() => loadAuthEnv(incomplete)).toThrow(/SERVICE_AUTH_SECRET/);
  });

  it('rejects a development JWT key in production', () => {
    expect(() =>
      loadAuthEnv({
        ...validEnv,
        NODE_ENV: 'production',
        JWT_ACCESS_PRIVATE_KEY: `# LINUXPILOT_DEV_ONLY\n${keys.privateKey}`,
      }),
    ).toThrow(/development key/);
  });

  it('rejects a short service secret', () => {
    expect(() =>
      loadAuthEnv({
        ...validEnv,
        SERVICE_AUTH_SECRET: 'too-short',
      }),
    ).toThrow(/SERVICE_AUTH_SECRET/);
  });

  it('rejects the retired HS256 secret in production', () => {
    expect(() =>
      loadAuthEnv({
        ...validEnv,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'abcdefghijklmnopqrstuvwxyz123456',
      }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });
});
