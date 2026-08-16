import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AUTH_ERROR_CODES } from '@linuxpilot/auth-contracts';
import { AppError, COOKIE_NAMES, HEADER_NAMES } from '@linuxpilot/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from './app.module';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { securityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { AuthClientService } from './modules/auth/auth-client.service';
import { loadGatewayEnv } from './config/env';

function cookieHeader(response: { headers: Record<string, unknown> }): string {
  const value = response.headers['set-cookie'];
  return Array.isArray(value) ? value.join(';') : String(value ?? '');
}

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.com',
  username: 'admin',
  status: 'ACTIVE',
  roles: ['super_admin'],
  permissions: ['users.view'],
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('API Gateway', () => {
  let app: INestApplication;
  const authClient = {
    request: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthClientService)
      .useValue(authClient)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(requestIdMiddleware);
    app.use(securityHeadersMiddleware(loadGatewayEnv()));
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    authClient.request.mockReset();
  });

  it('publishes security headers and OpenAPI without secrets', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/openapi.json');
    expect(response.status).toBe(200);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('SERVICE_AUTH_SECRET');
    expect(JSON.stringify(response.body)).not.toContain('PRIVATE KEY');
  });

  it('rejects mutating requests without CSRF', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/logout');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe(AUTH_ERROR_CODES.CSRF_REJECTED);
    expect(authClient.request).not.toHaveBeenCalled();
  });

  it('replaces an invalid request id', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .set(HEADER_NAMES.requestId, 'not-a-uuid');
    expect(response.headers[HEADER_NAMES.requestId]).not.toBe('not-a-uuid');
    expect(response.headers[HEADER_NAMES.requestId]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('applies config login limits, ignores spoofed X-Forwarded-For, and keeps refresh independent', async () => {
    authClient.request.mockResolvedValue({
      status: 200,
      payload: {
        data: { accessToken: 'a', refreshToken: 'r', expiresIn: 900, user },
        meta: { requestId: 'x' },
      },
    });

    const first = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ emailOrUsername: 'admin@example.com', password: 'CorrectHorse-Battery9' });
    const second = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '203.0.113.10')
      .send({ emailOrUsername: 'admin@example.com', password: 'CorrectHorse-Battery9' });
    const third = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '198.51.100.20')
      .send({ emailOrUsername: 'admin@example.com', password: 'CorrectHorse-Battery9' });
    const refresh = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${COOKIE_NAMES.refreshToken}=refresh-token; ${COOKIE_NAMES.csrfToken}=csrf`)
      .set(HEADER_NAMES.csrfToken, 'csrf');

    expect(first.status).toBe(200);
    const cookies = cookieHeader(first);
    expect(cookies).toContain(COOKIE_NAMES.accessToken);
    expect(cookies).toContain('HttpOnly');
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe(AUTH_ERROR_CODES.RATE_LIMITED);
    expect(refresh.status).toBe(200);
  });

  it('clears cookies when logout revoke fails', async () => {
    authClient.request.mockRejectedValue(
      new AppError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Auth service is unavailable', 502),
    );

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', `${COOKIE_NAMES.refreshToken}=refresh-token; ${COOKIE_NAMES.csrfToken}=csrf`)
      .set(HEADER_NAMES.csrfToken, 'csrf');

    expect(response.status).toBe(502);
    expect(cookieHeader(response)).toContain(`${COOKIE_NAMES.accessToken}=`);
  });

  it('rejects protected routes without an access cookie', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/auth/me');
    expect(response.status).toBe(401);
    expect(authClient.request).not.toHaveBeenCalled();
  });
});
