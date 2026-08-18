import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './client';

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = 'lp_csrf_token=; Max-Age=0; path=/';
  });

  it('retries once after a successful refresh', async () => {
    document.cookie = 'lp_csrf_token=csrf-token; path=/';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { code: 'AUTH_UNAUTHORIZED', message: 'no' },
            meta: { requestId: '1' },
          }),
          {
            status: 401,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { ok: true }, meta: { requestId: '2' } }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { user: { email: 'admin@example.com' } },
            meta: { requestId: '3' },
          }),
          {
            status: 200,
          },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    const result = await apiRequest<{ user: { email: string } }>('/auth/me');
    expect(result.user.email).toBe('admin@example.com');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries a GET after 403 when refresh succeeds', async () => {
    document.cookie = 'lp_csrf_token=csrf-token; path=/';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { code: 'AUTH_FORBIDDEN', message: 'no' },
            meta: { requestId: '1' },
          }),
          { status: 403 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { ok: true }, meta: { requestId: '2' } }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { items: [], total: 0 },
            meta: { requestId: '3' },
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    const result = await apiRequest<{ items: unknown[]; total: number }>('/ssh-keys');
    expect(result.total).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/auth/refresh');
  });

  it('does not refresh after a forbidden mutation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'AUTH_FORBIDDEN', message: 'no' },
          meta: { requestId: '1' },
        }),
        { status: 403 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/ssh-keys/generate', { method: 'POST', body: {} })).rejects.toMatchObject(
      {
        status: 403,
        code: 'AUTH_FORBIDDEN',
      },
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends credentials and a CSRF header', async () => {
    document.cookie = 'lp_csrf_token=csrf-token; path=/';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { success: true }, meta: { requestId: '1' } }), {
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/auth/logout', { method: 'POST' });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.credentials).toBe('include');
    expect(new Headers(init.headers).get('x-csrf-token')).toBe('csrf-token');
  });

  it('maps a network failure without leaking internals', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(
      apiRequest('/auth/login', { method: 'POST', body: {}, retry: false }),
    ).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });

  it('treats a non-JSON 502 as an unavailable gateway', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>bad gateway</html>', { status: 502 })),
    );

    await expect(
      apiRequest('/auth/login', { method: 'POST', body: {}, retry: false }),
    ).rejects.toMatchObject({
      status: 502,
      code: 'GATEWAY_UNAVAILABLE',
    });
  });
});
