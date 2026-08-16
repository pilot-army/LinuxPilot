import { AUTH_ERROR_CODES } from '@linuxpilot/auth-contracts';
import { generateRsaKeyPair } from '@linuxpilot/config';
import { sign } from 'jsonwebtoken';
import { TokenService } from './token.service';
import { type AppConfigService } from '../../config/app-config.service';

const keys = generateRsaKeyPair();
const otherKeys = generateRsaKeyPair();

function createService(overrides: Record<string, unknown> = {}) {
  return new TokenService({
    env: {
      JWT_ACCESS_PRIVATE_KEY: keys.privateKey,
      JWT_ACCESS_PUBLIC_KEY: keys.publicKey,
      JWT_ACCESS_TTL: '15m',
      JWT_ISSUER: 'linuxpilot-auth',
      JWT_AUDIENCE: 'linuxpilot-gateway',
      REFRESH_TOKEN_TTL_DAYS: 30,
      ...overrides,
    },
  } as unknown as AppConfigService);
}

const payload = {
  sub: '11111111-1111-4111-8111-111111111111',
  sid: '22222222-2222-4222-8222-222222222222',
  email: 'admin@example.com',
  username: 'admin',
  roles: ['admin'],
  permissions: ['users.view'],
};

describe('TokenService', () => {
  it('signs and verifies an RS256 access token', () => {
    const service = createService();
    const token = service.signAccessToken(payload);
    expect(service.verifyAccessToken(token)).toMatchObject(payload);
  });

  it('rejects an unexpected algorithm', () => {
    const service = createService();
    const hsToken = sign(payload, 'abcdefghijklmnopqrstuvwxyz123456', {
      algorithm: 'HS256',
      issuer: 'linuxpilot-auth',
      audience: 'linuxpilot-gateway',
    });

    expect(() => service.verifyAccessToken(hsToken)).toThrow(
      expect.objectContaining({ code: AUTH_ERROR_CODES.TOKEN_INVALID }),
    );
  });

  it('rejects a token signed with another key or audience', () => {
    const service = createService();
    const foreign = sign(payload, otherKeys.privateKey, {
      algorithm: 'RS256',
      issuer: 'linuxpilot-auth',
      audience: 'linuxpilot-gateway',
    });
    const wrongAud = sign(payload, keys.privateKey, {
      algorithm: 'RS256',
      issuer: 'linuxpilot-auth',
      audience: 'someone-else',
    });

    expect(() => service.verifyAccessToken(foreign)).toThrow(
      expect.objectContaining({ code: AUTH_ERROR_CODES.TOKEN_INVALID }),
    );
    expect(() => service.verifyAccessToken(wrongAud)).toThrow(
      expect.objectContaining({ code: AUTH_ERROR_CODES.TOKEN_INVALID }),
    );
  });
});
