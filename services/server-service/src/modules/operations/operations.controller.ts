import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { PERMISSIONS, type AuthenticatedUser } from '@linuxpilot/auth-contracts';
import {
  createOperationSchema,
  listOperationsQuerySchema,
  type CreateOperationRequest,
  type ListOperationsQuery,
} from '@linuxpilot/server-contracts';
import { z } from 'zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { getRequestId } from '../../common/http/request-context';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { type Request } from 'express';
import { OperationsService } from './operations.service';

const idSchema = z.string().uuid();

@Controller()
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Get('server-operations')
  @RequirePermissions(PERMISSIONS.SERVERS_VIEW)
  listAll(@Query(new ZodValidationPipe(listOperationsQuerySchema)) query: ListOperationsQuery) {
    return this.operations.list(query);
  }

  @Get('servers/:id/operations')
  @RequirePermissions(PERMISSIONS.SERVERS_VIEW)
  list(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Query(new ZodValidationPipe(listOperationsQuerySchema)) query: ListOperationsQuery,
  ) {
    return this.operations.list(query, id);
  }

  @Post('servers/:id/operations')
  @RequirePermissions(PERMISSIONS.SERVERS_UPDATE)
  create(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(createOperationSchema)) body: CreateOperationRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.operations.create(id, body, user, getRequestId(request));
  }

  @Get('servers/:id/operations/:operationId')
  @RequirePermissions(PERMISSIONS.SERVERS_VIEW)
  get(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Param('operationId', new ZodValidationPipe(idSchema)) operationId: string,
  ) {
    return this.operations.getById(id, operationId);
  }
}
