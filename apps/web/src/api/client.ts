import { COOKIE_NAMES, HEADER_NAMES, type ApiError, type ApiSuccess } from '@linuxpilot/common';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE' | 'PATCH';
  body?: unknown;
  retry?: boolean;
};

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown[] = [],
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }
  const prefix = `${encodeURIComponent(name)}=`;
  const match = document.cookie.split('; ').find((row) => row.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : undefined;
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      [HEADER_NAMES.csrfToken]: readCookie(COOKIE_NAMES.csrfToken) ?? '',
    },
  })
    .then((response) => response.ok)
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers();
  const csrfToken = readCookie(COOKIE_NAMES.csrfToken);
  if (csrfToken) {
    headers.set(HEADER_NAMES.csrfToken, csrfToken);
  }
  if (options.body !== undefined) {
    headers.set('content-type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiRequestError(0, 'NETWORK_ERROR', 'Unable to reach the control plane.');
  }

  if (
    shouldRefreshSession(response.status, options) &&
    path !== '/auth/refresh' &&
    path !== '/auth/login'
  ) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, retry: false });
    }
  }

  const payload = await readJsonPayload<T>(response);
  if (!payload || !response.ok || 'error' in payload) {
    const error = payload && 'error' in payload ? payload.error : undefined;
    throw new ApiRequestError(
      response.status,
      error?.code ?? unavailableCode(response.status),
      error?.message ?? 'Request failed',
      error?.details ?? [],
    );
  }

  return payload.data;
}

async function readJsonPayload<T>(response: Response): Promise<ApiSuccess<T> | ApiError | null> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as ApiSuccess<T> | ApiError;
  } catch {
    return null;
  }
}

function shouldRefreshSession(status: number, options: RequestOptions): boolean {
  if (options.retry === false) {
    return false;
  }
  if (status === 401) {
    return true;
  }
  return status === 403 && (options.method ?? 'GET') === 'GET';
}

function unavailableCode(status: number): string {
  if (status === 0) {
    return 'NETWORK_ERROR';
  }
  if (status === 502 || status === 503 || status === 504) {
    return 'GATEWAY_UNAVAILABLE';
  }
  return 'INTERNAL_ERROR';
}
