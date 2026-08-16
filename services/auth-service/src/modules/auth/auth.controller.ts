import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  PERMISSIONS,
  internalLoginRequestSchema,
  logoutRequestSchema,
  refreshRequestSchema,
  updateUserRolesSchema,
  updateUserStatusSchema,
  type AuthenticatedUser,
  type InternalLoginRequest,
  type LogoutRequest,
  type RefreshRequest,
  type UpdateUserRolesRequest,
  type UpdateUserStatusRequest,
} from '@linuxpilot/auth-contracts';
import { type Request } from 'express';
import { AllowAuthenticated } from '../../common/decorators/allow-authenticated.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { getRequestId } from '../../common/http/request-context';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(
    @Body(new ZodValidationPipe(internalLoginRequestSchema)) body: InternalLoginRequest,
    @Req() request: Request,
  ) {
    return this.authService.login(body, getRequestId(request));
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(
    @Body(new ZodValidationPipe(refreshRequestSchema)) body: RefreshRequest,
    @Req() request: Request,
  ) {
    return this.authService.refresh(body.refreshToken, getRequestId(request), request.ip);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(
    @Body(new ZodValidationPipe(logoutRequestSchema)) body: LogoutRequest,
    @Req() request: Request,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    await this.authService.logout(
      body.refreshToken,
      user?.sessionId,
      user?.id,
      getRequestId(request),
      request.ip,
    );
    return { success: true };
  }

  @AllowAuthenticated()
  @Post('logout-all')
  @HttpCode(200)
  async logoutAll(@CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    await this.authService.logoutAll(user.id, getRequestId(request), request.ip);
    return { success: true };
  }

  @AllowAuthenticated()
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return { user: await this.authService.me(user.id) };
  }

  @AllowAuthenticated()
  @Get('sessions')
  async sessions(@CurrentUser() user: AuthenticatedUser) {
    return { sessions: await this.authService.listSessions(user) };
  }

  @AllowAuthenticated()
  @Delete('sessions/:sessionId')
  @HttpCode(200)
  async revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Req() request: Request,
  ) {
    await this.authService.revokeSession(user.id, sessionId, getRequestId(request), request.ip);
    return { success: true };
  }

  @RequirePermissions(PERMISSIONS.USERS_UPDATE)
  @Patch('admin/users/:userId/status')
  async updateStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body(new ZodValidationPipe(updateUserStatusSchema)) body: UpdateUserStatusRequest,
    @Req() request: Request,
  ) {
    return {
      user: await this.authService.changeUserStatus(
        actor.id,
        userId,
        body.status,
        getRequestId(request),
        request.ip,
      ),
    };
  }

  @RequirePermissions(PERMISSIONS.USERS_UPDATE)
  @Patch('admin/users/:userId/roles')
  async updateRoles(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body(new ZodValidationPipe(updateUserRolesSchema)) body: UpdateUserRolesRequest,
    @Req() request: Request,
  ) {
    return {
      user: await this.authService.changeUserRoles(
        actor.id,
        userId,
        body.roles,
        getRequestId(request),
        request.ip,
      ),
    };
  }
}
