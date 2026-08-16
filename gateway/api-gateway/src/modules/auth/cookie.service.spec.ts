import { type Response } from 'express';
import { COOKIE_NAMES } from '@linuxpilot/common';
import { CookieService } from './cookie.service';
import { type AppConfigService } from '../../config/app-config.service';

function createService(overrides: Record<string, unknown> = {}) {
  return new CookieService({
    env: {
      COOKIE_SECURE: false,
      JWT_ACCESS_TTL: '15m',
      REFRESH_TOKEN_TTL_DAYS: 30,
      ...overrides,
    },
  } as AppConfigService);
}

describe('CookieService', () => {
  it('sets HttpOnly auth cookies and a readable CSRF cookie', () => {
    const cookies: Array<{ name: string; options: Record<string, unknown> }> = [];
    const response = {
      cookie: (name: string, _value: string, options: Record<string, unknown>) => {
        cookies.push({ name, options });
      },
    } as unknown as Response;

    createService().setAuthCookies(response, {
      accessToken: 'access',
      refreshToken: 'refresh',
      csrfToken: 'csrf',
    });

    const access = cookies.find((item) => item.name === COOKIE_NAMES.accessToken);
    const refresh = cookies.find((item) => item.name === COOKIE_NAMES.refreshToken);
    const csrf = cookies.find((item) => item.name === COOKIE_NAMES.csrfToken);

    expect(access?.options.httpOnly).toBe(true);
    expect(access?.options.sameSite).toBe('lax');
    expect(access?.options.path).toBe('/');
    expect(access?.options.maxAge).toBe(15 * 60 * 1000);
    expect(refresh?.options.maxAge).toBe(30 * 24 * 60 * 60 * 1000);
    expect(csrf?.options.httpOnly).toBe(false);
  });

  it('uses configured TTL values for cookie max-age', () => {
    const cookies: Array<{ name: string; options: Record<string, unknown> }> = [];
    const response = {
      cookie: (name: string, _value: string, options: Record<string, unknown>) => {
        cookies.push({ name, options });
      },
    } as unknown as Response;

    createService({ JWT_ACCESS_TTL: '5m', REFRESH_TOKEN_TTL_DAYS: 2 }).setAuthCookies(response, {
      accessToken: 'access',
      refreshToken: 'refresh',
      csrfToken: 'csrf',
    });

    expect(cookies.find((item) => item.name === COOKIE_NAMES.accessToken)?.options.maxAge).toBe(
      5 * 60 * 1000,
    );
    expect(cookies.find((item) => item.name === COOKIE_NAMES.refreshToken)?.options.maxAge).toBe(
      2 * 24 * 60 * 60 * 1000,
    );
  });

  it('clears cookies with the same path and security attributes', () => {
    const cookies: Array<{ name: string; options: Record<string, unknown> }> = [];
    const response = {
      cookie: (name: string, _value: string, options: Record<string, unknown>) => {
        cookies.push({ name, options });
      },
    } as unknown as Response;

    createService({ COOKIE_SECURE: true }).clearAuthCookies(response);
    for (const cookie of cookies) {
      expect(cookie.options.path).toBe('/');
      expect(cookie.options.sameSite).toBe('lax');
      expect(cookie.options.secure).toBe(true);
      expect(cookie.options.maxAge).toBe(0);
    }
  });
});
