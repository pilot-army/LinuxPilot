import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import { PERMISSIONS, type AuthenticatedUser } from '@linuxpilot/auth-contracts';
import {
  attachServersSchema,
  createSpaceSchema,
  deleteSpaceSchema,
  updateSpaceSchema,
  type AttachServersRequest,
  type CreateSpaceRequest,
  type DeleteSpaceRequest,
  type UpdateSpaceRequest,
} from '@linuxpilot/server-contracts';
import { z } from 'zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { getRequestId } from '../../common/http/request-context';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { type Request } from 'express';
import { GroupsService } from './groups.service';

const idSchema = z.string().uuid();
const idOrSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$|^[0-9a-f-]{36}$/i);

@Controller(['server-spaces', 'server-groups'])
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SERVERS_VIEW)
  list() {
    return this.groups.list();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SERVERS_VIEW)
  getById(@Param('id', new ZodValidationPipe(idOrSlugSchema)) id: string) {
    return this.groups.getByIdOrSlug(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SERVERS_UPDATE)
  create(
    @Body(new ZodValidationPipe(createSpaceSchema)) body: CreateSpaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.groups.create(body, user, getRequestId(request));
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SERVERS_UPDATE)
  update(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(updateSpaceSchema)) body: UpdateSpaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.groups.update(id, body, user, getRequestId(request));
  }

  @Post(':id/servers')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SERVERS_UPDATE)
  attachServers(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(attachServersSchema)) body: AttachServersRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.groups.attachServers(id, body, user, getRequestId(request));
  }

  @Post(':id/move-servers')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SERVERS_UPDATE)
  moveServers(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(attachServersSchema)) body: AttachServersRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.groups.attachServers(id, body, user, getRequestId(request));
  }

  @Delete(':id')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SERVERS_UPDATE)
  remove(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Body() body?: DeleteSpaceRequest,
  ) {
    return this.groups.remove(
      id,
      user,
      getRequestId(request),
      deleteSpaceSchema.parse(body ?? {}),
    );
  }
}
