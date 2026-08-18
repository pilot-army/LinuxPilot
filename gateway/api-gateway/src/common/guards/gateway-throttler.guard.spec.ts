import { type ExecutionContext } from '@nestjs/common';
import { skipUnlessPath, skipUnlessPathPrefix } from './gateway-throttler.guard';

function context(method: string, path: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method, path }),
    }),
  } as ExecutionContext;
}

describe('named throttler skip helpers', () => {
  it('applies a named limit only to the matching route', () => {
    expect(skipUnlessPath(context('POST', '/api/v1/auth/login'), 'POST', '/api/v1/auth/login')).toBe(
      false,
    );
    expect(skipUnlessPath(context('GET', '/api/v1/servers'), 'POST', '/api/v1/auth/login')).toBe(
      true,
    );
    expect(skipUnlessPath(context('GET', '/api/v1/health'), 'POST', '/api/v1/auth/login')).toBe(
      true,
    );
  });

  it('applies the agent limit only under /api/v1/agent', () => {
    expect(skipUnlessPathPrefix(context('POST', '/api/v1/agent/heartbeat'), '/api/v1/agent')).toBe(
      false,
    );
    expect(skipUnlessPathPrefix(context('GET', '/api/v1/servers'), '/api/v1/agent')).toBe(true);
  });
});
