import { Injectable } from '@nestjs/common';
import { COOKIE_NAMES, daysToMs, parseDurationToMs } from '@linuxpilot/common';
import { type CookieOptions, type Response } from 'express';
import { randomBytes } from 'node:crypto';
import { AppConfigService } from '../../config/app-config.service';

@Injectable()
export class CookieService {
  constructor(private readonly config: AppConfigService) {}

  createCsrfToken(): string {
    return randomBytes(32).toString('base64url');
  }

  setAuthCookies(
    response: Response,
    tokens: { accessToken: string; refreshToken: string; csrfToken: string },
  ): void {
    response.cookie(
      COOKIE_NAMES.accessToken,
      tokens.accessToken,
      this.authCookieOptions(this.accessMaxAgeMs()),
    );
    response.cookie(
      COOKIE_NAMES.refreshToken,
      tokens.refreshToken,
      this.authCookieOptions(this.refreshMaxAgeMs()),
    );
    response.cookie(COOKIE_NAMES.csrfToken, tokens.csrfToken, {
      ...this.baseCookieOptions(),
      httpOnly: false,
      maxAge: this.refreshMaxAgeMs(),
    });
  }

  clearAuthCookies(response: Response): void {
    const expired = { ...this.baseCookieOptions(), maxAge: 0 };
    response.cookie(COOKIE_NAMES.accessToken, '', { ...expired, httpOnly: true });
    response.cookie(COOKIE_NAMES.refreshToken, '', { ...expired, httpOnly: true });
    response.cookie(COOKIE_NAMES.csrfToken, '', { ...expired, httpOnly: false });
  }

  accessMaxAgeMs(): number {
    return parseDurationToMs(this.config.env.JWT_ACCESS_TTL);
  }

  refreshMaxAgeMs(): number {
    return daysToMs(this.config.env.REFRESH_TOKEN_TTL_DAYS);
  }

  private authCookieOptions(maxAge: number): CookieOptions {
    return {
      ...this.baseCookieOptions(),
      httpOnly: true,
      maxAge,
    };
  }

  private baseCookieOptions(): CookieOptions {
    return {
      secure: this.config.env.COOKIE_SECURE,
      sameSite: 'lax',
      path: '/',
    };
  }
}
