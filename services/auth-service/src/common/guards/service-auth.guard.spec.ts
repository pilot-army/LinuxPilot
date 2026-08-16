import { AppError } from '@linuxpilot/common';
import { signServiceRequest, serviceAuthHeaderRecord } from '@linuxpilot/common/service-auth';
import { type ExecutionContext } from '@nestjs/common';
import { ServiceAuthGuard } from './service-auth.guard';
import { type AppConfigService } from '../../config/app-config.service';

const CURRENT = 'current-service-auth-secret-min-32-chars';
const PREVIOUS = 'previous-service-auth-secret-min-32-ch';

function createGuard(overrides: Record<string, unknown> = {}) {
  return new ServiceAuthGuard({
    env: {
      SERVICE_AUTH_SECRET: CURRENT,
      SERVICE_AUTH_SECRET_PREVIOUS: PREVIOUS,
      SERVICE_AUTH_MAX_SKEW_MS: 30_000,
      ...overrides,
    },
  } as unknown as AppConfigService);
}

function contextFor(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

function signedRequest(
  secret: string,
  overrides: {
    method?: string;
    path?: string;
    originalUrl?: string;
    body?: string;
    now?: number;
    headers?: Record<string, string>;
  } = {},
) {
  const method = overrides.method ?? 'POST';
  const path = overrides.path ?? '/auth/login';
  const body = overrides.body ?? '{"ok":true}';
  const signed = signServiceRequest(secret, method, path, body, overrides.now ?? Date.now());
  const headers = {
    ...serviceAuthHeaderRecord(signed),
    ...overrides.headers,
  };
  return {
    method,
    path: path.split('?')[0],
    originalUrl: overrides.originalUrl ?? path,
    url: overrides.originalUrl ?? path,
    rawBody: Buffer.from(body),
    header: (name: string) => headers[name],
  };
}

describe('ServiceAuthGuard', () => {
  it('accepts a valid signed request', () => {
    const guard = createGuard();
    expect(guard.canActivate(contextFor(signedRequest(CURRENT)))).toBe(true);
  });

  it('rejects an expired timestamp', () => {
    const guard = createGuard();
    const request = signedRequest(CURRENT, { now: Date.now() - 60_000 });
    expect(() => guard.canActivate(contextFor(request))).toThrow(AppError);
  });

  it('rejects a replayed nonce', () => {
    const guard = createGuard();
    const request = signedRequest(CURRENT);
    expect(guard.canActivate(contextFor(request))).toBe(true);
    expect(() => guard.canActivate(contextFor(request))).toThrow(AppError);
  });

  it('accepts the previous secret during rotation', () => {
    const guard = createGuard();
    expect(guard.canActivate(contextFor(signedRequest(PREVIOUS)))).toBe(true);
  });

  it('rejects a request whose query string was changed after signing', () => {
    const guard = createGuard();
    const request = signedRequest(CURRENT, {
      path: '/auth/me?role=admin',
      originalUrl: '/auth/me?role=root',
    });
    expect(() => guard.canActivate(contextFor(request))).toThrow(AppError);
  });

  it('does not treat health as a signed route', () => {
    const guard = createGuard();
    expect(
      guard.canActivate(
        contextFor({
          path: '/health',
          method: 'GET',
          header: () => undefined,
        }),
      ),
    ).toBe(true);
  });
});
