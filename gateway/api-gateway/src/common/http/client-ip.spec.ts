import { type Request } from 'express';
import { resolveClientIp } from './client-ip';

function request(overrides: Partial<Request> & { headers?: Record<string, string> }): Request {
  return {
    socket: { remoteAddress: '10.0.0.8' },
    ip: '10.0.0.8',
    header(name: string) {
      return overrides.headers?.[name.toLowerCase()];
    },
    ...overrides,
  } as unknown as Request;
}

describe('resolveClientIp', () => {
  it('ignores X-Forwarded-For when the proxy is not trusted', () => {
    const ip = resolveClientIp(
      request({
        headers: { 'x-forwarded-for': '203.0.113.9' },
      }),
      { TRUST_PROXY: false },
    );
    expect(ip).toBe('10.0.0.8');
  });

  it('uses the forwarded client IP behind a trusted proxy', () => {
    const ip = resolveClientIp(
      request({
        headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
        ip: '203.0.113.9',
      }),
      { TRUST_PROXY: true },
    );
    expect(ip).toBe('203.0.113.9');
  });
});
