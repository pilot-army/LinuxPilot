import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  AUTH_ERROR_CODES,
  loginRequestSchema,
  updateUserRolesSchema,
  updateUserStatusSchema,
  type AuthUserResponse,
  type LoginRequest,
  type LoginResult,
  type SessionView,
  type UpdateUserRolesRequest,
  type UpdateUserStatusRequest,
} from '@linuxpilot/auth-contracts';
import { AppError, COOKIE_NAMES, sanitizeIpAddress } from '@linuxpilot/common';
import { type Request, type Response } from 'express';
import { AppConfigService } from '../../config/app-config.service';
import { getRequestId } from '../../common/http/request-context';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { readCookie, requireAccessToken } from './access-token';
import { AuthClientService } from './auth-client.service';
import { CookieService } from './cookie.service';

@Controller('api/v1/auth')
@SkipThrottle({ login: true, refresh: true })
export class AuthProxyController {
  constructor(
    private readonly authClient: AuthClientService,
    private readonly cookieService: CookieService,
    private readonly config: AppConfigService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @SkipThrottle({ default: true, refresh: true, login: false })
  async login(
    @Body(new ZodValidationPipe(loginRequestSchema)) body: LoginRequest,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authClient.request<LoginResult>({
      method: 'POST',
      path: '/auth/login',
      requestId: getRequestId(request),
      body: {
        emailOrUsername: body.emailOrUsername,
        password: body.password,
        userAgent: request.get('user-agent') ?? undefined,
        ipAddress: sanitizeIpAddress(request.ip),
      },
    });

    this.setSessionCookies(response, result.payload.data);
    return { user: result.payload.data.user };
  }

  @Post('refresh')
  @HttpCode(200)
  @SkipThrottle({ default: true, login: true, refresh: false })
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = readCookie(request, COOKIE_NAMES.refreshToken);
    if (!refreshToken) {
      throw new AppError(AUTH_ERROR_CODES.UNAUTHORIZED, 'Authentication required', 401);
    }

    const result = await this.authClient.request<LoginResult>({
      method: 'POST',
      path: '/auth/refresh',
      requestId: getRequestId(request),
      body: { refreshToken },
    });

    this.setSessionCookies(response, result.payload.data);
    return { user: result.payload.data.user };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = readCookie(request, COOKIE_NAMES.refreshToken);
    const accessToken = readCookie(request, COOKIE_NAMES.accessToken);

    try {
      if (refreshToken || accessToken) {
        await this.authClient.request({
          method: 'POST',
          path: '/auth/logout',
          requestId: getRequestId(request),
          accessToken,
          body: { refreshToken },
        });
      }
      this.cookieService.clearAuthCookies(response);
      return { success: true, revoked: true };
    } catch (error) {
      this.cookieService.clearAuthCookies(response);
      throw error;
    }
  }

  @Post('logout-all')
  @HttpCode(200)
  async logoutAll(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    try {
      await this.authClient.request({
        method: 'POST',
        path: '/auth/logout-all',
        requestId: getRequestId(request),
        accessToken: this.requireAccess(request),
      });
      this.cookieService.clearAuthCookies(response);
      return { success: true, revoked: true };
    } catch (error) {
      this.cookieService.clearAuthCookies(response);
      throw error;
    }
  }

  @Get('me')
  async me(@Req() request: Request) {
    const result = await this.authClient.request<AuthUserResponse>({
      method: 'GET',
      path: '/auth/me',
      requestId: getRequestId(request),
      accessToken: this.requireAccess(request),
    });
    return result.payload.data;
  }

  @Get('sessions')
  async sessions(@Req() request: Request) {
    const result = await this.authClient.request<{ sessions: SessionView[] }>({
      method: 'GET',
      path: '/auth/sessions',
      requestId: getRequestId(request),
      accessToken: this.requireAccess(request),
    });
    return result.payload.data;
  }

  @Delete('sessions/:sessionId')
  @HttpCode(200)
  async revokeSession(@Param('sessionId') sessionId: string, @Req() request: Request) {
    const result = await this.authClient.request<{ success: boolean }>({
      method: 'DELETE',
      path: `/auth/sessions/${sessionId}`,
      requestId: getRequestId(request),
      accessToken: this.requireAccess(request),
    });
    return result.payload.data;
  }

  @Patch('admin/users/:userId/status')
  async updateStatus(
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(updateUserStatusSchema)) body: UpdateUserStatusRequest,
    @Req() request: Request,
  ) {
    const result = await this.authClient.request<{ user: AuthUserResponse['user'] }>({
      method: 'PATCH',
      path: `/auth/admin/users/${userId}/status`,
      requestId: getRequestId(request),
      accessToken: this.requireAccess(request),
      body,
    });
    return result.payload.data;
  }

  @Patch('admin/users/:userId/roles')
  async updateRoles(
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(updateUserRolesSchema)) body: UpdateUserRolesRequest,
    @Req() request: Request,
  ) {
    const result = await this.authClient.request<{ user: AuthUserResponse['user'] }>({
      method: 'PATCH',
      path: `/auth/admin/users/${userId}/roles`,
      requestId: getRequestId(request),
      accessToken: this.requireAccess(request),
      body,
    });
    return result.payload.data;
  }

  private requireAccess(request: Request): string {
    return requireAccessToken(
      request,
      this.config.env.JWT_ACCESS_PUBLIC_KEY,
      this.config.env.JWT_ISSUER,
      this.config.env.JWT_AUDIENCE,
    );
  }

  private setSessionCookies(response: Response, tokens: LoginResult): void {
    this.cookieService.setAuthCookies(response, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      csrfToken: this.cookieService.createCsrfToken(),
    });
  }
}
