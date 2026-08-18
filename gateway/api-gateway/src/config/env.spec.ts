import { ConfigValidationError, generateRsaKeyPair } from '@linuxpilot/config';
import { loadGatewayEnv } from './env';

const keys = generateRsaKeyPair();

const validEnv: NodeJS.ProcessEnv = {
  NODE_ENV: 'test',
  GATEWAY_PORT: '3000',
  GATEWAY_HOST: '0.0.0.0',
  FRONTEND_ORIGIN: 'http://localhost:5173',
  AUTH_SERVICE_URL: 'http://localhost:3001',
  SERVER_SERVICE_URL: 'http://localhost:3002',
  JWT_ACCESS_PUBLIC_KEY: keys.publicKey,
  JWT_ISSUER: 'linuxpilot-auth',
  JWT_AUDIENCE: 'linuxpilot-gateway',
  JWT_ACCESS_TTL: '15m',
  REFRESH_TOKEN_TTL_DAYS: '30',
  COOKIE_SECURE: 'false',
  TRUST_PROXY: 'false',
  LOGIN_RATE_LIMIT: '5',
  REFRESH_RATE_LIMIT: '10',
  RATE_LIMIT_TTL_MS: '60000',
  SERVICE_AUTH_SECRET: 'abcdefghijklmnopqrstuvwxyz123456',
  LOG_LEVEL: 'silent',
};

describe('loadGatewayEnv', () => {
  it('fails when AUTH_SERVICE_URL is missing', () => {
    const { AUTH_SERVICE_URL: _omitted, ...incomplete } = validEnv;
    expect(() => loadGatewayEnv(incomplete)).toThrow(ConfigValidationError);
    expect(() => loadGatewayEnv(incomplete)).toThrow(/AUTH_SERVICE_URL/);
  });

  it('reads rate limits from the environment', () => {
    const config = loadGatewayEnv({
      ...validEnv,
      LOGIN_RATE_LIMIT: '3',
      REFRESH_RATE_LIMIT: '7',
      LOGIN_RATE_LIMIT_TTL_MS: '120000',
    });
    expect(config.LOGIN_RATE_LIMIT).toBe(3);
    expect(config.REFRESH_RATE_LIMIT).toBe(7);
    expect(config.LOGIN_RATE_LIMIT_TTL_MS).toBe(120000);
    expect(config.RATE_LIMIT_STORE).toBe('memory');
  });

  it('refuses COOKIE_SECURE=false in production', () => {
    expect(() =>
      loadGatewayEnv({
        ...validEnv,
        NODE_ENV: 'production',
        COOKIE_SECURE: 'false',
      }),
    ).toThrow(/COOKIE_SECURE/);
  });

  it('rejects a development public key in production', () => {
    expect(() =>
      loadGatewayEnv({
        ...validEnv,
        NODE_ENV: 'production',
        COOKIE_SECURE: 'true',
        JWT_ACCESS_PUBLIC_KEY: `# LINUXPILOT_DEV_ONLY\n${keys.publicKey}`,
      }),
    ).toThrow(/development key/);
  });

  it('refuses a private key on the gateway in every environment', () => {
    expect(() =>
      loadGatewayEnv({
        ...validEnv,
        JWT_ACCESS_PRIVATE_KEY: keys.privateKey,
      }),
    ).toThrow(/private key/);
    expect(() =>
      loadGatewayEnv({
        ...validEnv,
        NODE_ENV: 'production',
        COOKIE_SECURE: 'true',
        JWT_ACCESS_PRIVATE_KEY_PATH: '/run/secrets/jwt-private.pem',
      }),
    ).toThrow(/private key/);
  });
});
