import { AUTH_ERROR_CODES } from '@linuxpilot/auth-contracts';
import { AuthClientService } from './auth-client.service';
import { type AppConfigService } from '../../config/app-config.service';

describe('AuthClientService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('maps an aborted request to 504 without leaking internals', async () => {
    global.fetch = jest.fn().mockImplementation((_url, options: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        options.signal?.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      });
    });

    const service = new AuthClientService({
      env: {
        AUTH_SERVICE_URL: 'http://127.0.0.1:3999',
        AUTH_SERVICE_TIMEOUT_MS: 10,
        SERVICE_AUTH_SECRET: 'abcdefghijklmnopqrstuvwxyz123456',
      },
    } as AppConfigService);

    await expect(
      service.request({
        method: 'GET',
        path: '/auth/me',
        requestId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    ).rejects.toMatchObject({
      code: AUTH_ERROR_CODES.INTERNAL_ERROR,
      statusCode: 504,
      message: 'Auth service timed out',
    });
  });

  it('does not include stack traces in mapped errors', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED connect 10.0.0.5'));

    const service = new AuthClientService({
      env: {
        AUTH_SERVICE_URL: 'http://127.0.0.1:3999',
        AUTH_SERVICE_TIMEOUT_MS: 50,
        SERVICE_AUTH_SECRET: 'abcdefghijklmnopqrstuvwxyz123456',
      },
    } as AppConfigService);

    await expect(
      service.request({
        method: 'GET',
        path: '/auth/me',
        requestId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    ).rejects.toMatchObject({
      statusCode: 502,
      message: 'Auth service is unavailable',
    });
  });
});
