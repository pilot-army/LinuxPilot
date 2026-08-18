import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { PERMISSIONS, type AuthenticatedUser } from '@linuxpilot/auth-contracts';
import {
  addPublicSshKeySchema,
  generateSshKeySchema,
  importPrivateSshKeySchema,
  inspectSshKeySchema,
  installSshKeySchema,
  listSshKeysQuerySchema,
  rotateSshKeySchema,
  updateSshKeySchema,
  type AddPublicSshKeyRequest,
  type GenerateSshKeyRequest,
  type ImportPrivateSshKeyRequest,
  type InspectSshKeyRequest,
  type InstallSshKeyRequest,
  type ListSshKeysQuery,
  type RotateSshKeyRequest,
  type UpdateSshKeyRequest,
} from '@linuxpilot/server-contracts';
import { type Request } from 'express';
import { z } from 'zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { getRequestId } from '../../common/http/request-context';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SshKeysService } from './ssh-keys.service';

const idSchema = z.string().uuid();

@Controller('ssh-keys')
export class SshKeysController {
  constructor(private readonly sshKeys: SshKeysService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SSH_KEYS_READ)
  list(@Query(new ZodValidationPipe(listSshKeysQuerySchema)) query: ListSshKeysQuery) {
    return this.sshKeys.list(query);
  }

  @Post('inspect')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SSH_KEYS_CREATE)
  inspect(@Body(new ZodValidationPipe(inspectSshKeySchema)) body: InspectSshKeyRequest) {
    return this.sshKeys.inspect(body);
  }

  @Post('import')
  @RequirePermissions(PERMISSIONS.SSH_KEYS_CREATE)
  importPrivate(
    @Body(new ZodValidationPipe(importPrivateSshKeySchema)) body: ImportPrivateSshKeyRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.sshKeys.importPrivate(body, user, getRequestId(request));
  }

  @Post('public')
  @RequirePermissions(PERMISSIONS.SSH_KEYS_CREATE)
  addPublic(
    @Body(new ZodValidationPipe(addPublicSshKeySchema)) body: AddPublicSshKeyRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.sshKeys.addPublic(body, user, getRequestId(request));
  }

  @Post('generate')
  @RequirePermissions(PERMISSIONS.SSH_KEYS_CREATE)
  generate(
    @Body(new ZodValidationPipe(generateSshKeySchema)) body: GenerateSshKeyRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.sshKeys.generate(body, user, getRequestId(request));
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SSH_KEYS_READ)
  getById(@Param('id', new ZodValidationPipe(idSchema)) id: string) {
    return this.sshKeys.getById(id);
  }

  @Get(':id/usages')
  @RequirePermissions(PERMISSIONS.SSH_KEYS_READ)
  usages(@Param('id', new ZodValidationPipe(idSchema)) id: string) {
    return this.sshKeys.usages(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SSH_KEYS_UPDATE)
  update(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(updateSshKeySchema)) body: UpdateSshKeyRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.sshKeys.update(id, body, user, getRequestId(request));
  }

  @Post(':id/disable')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SSH_KEYS_DISABLE)
  disable(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.sshKeys.disable(id, user, getRequestId(request));
  }

  @Post(':id/install')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SSH_KEYS_INSTALL)
  install(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(installSshKeySchema)) body: InstallSshKeyRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.sshKeys.install(id, body, user, getRequestId(request));
  }

  @Post(':id/rotate')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SSH_KEYS_ROTATE)
  rotate(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(rotateSshKeySchema)) body: RotateSshKeyRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.sshKeys.rotate(id, body, user, getRequestId(request));
  }

  @Delete(':id')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SSH_KEYS_DELETE)
  remove(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.sshKeys.remove(id, user, getRequestId(request));
  }
}
