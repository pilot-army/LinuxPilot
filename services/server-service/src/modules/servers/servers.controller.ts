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
  addTagsSchema,
  assignGroupSchema,
  assignSpaceSchema,
  bulkGroupSchema,
  bulkSpaceSchema,
  bulkMaintenanceSchema,
  bulkOperationsSchema,
  bulkTagsSchema,
  createServerSchema,
  listEventsQuerySchema,
  listServersQuerySchema,
  maintenanceSchema,
  metricsQuerySchema,
  paginationQuerySchema,
  updateServerSchema,
  type AddTagsRequest,
  type AssignGroupRequest,
  type AssignSpaceRequest,
  type BulkGroupRequest,
  type BulkSpaceRequest,
  type BulkMaintenanceRequest,
  type BulkOperationsRequest,
  type BulkTagsRequest,
  type CreateServerRequest,
  type ListEventsQuery,
  type ListServersQuery,
  type MaintenanceRequest,
  type MetricsQuery,
  type UpdateServerRequest,
} from '@linuxpilot/server-contracts';
import { z } from 'zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { getRequestId } from '../../common/http/request-context';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { type Request } from 'express';
import { EventsService } from '../events/events.service';
import { OperationsService } from '../operations/operations.service';
import { UpdatesService } from '../updates/updates.service';
import { ServersService } from './servers.service';

const idSchema = z.string().uuid();
const tagSchema = z.string().trim().min(1).max(32);
const auditQuerySchema = paginationQuerySchema.extend({
  serverId: z.string().uuid().optional(),
  actorId: z.string().uuid().optional(),
  action: z.string().trim().max(80).optional(),
  result: z.string().trim().max(32).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

@Controller()
export class ServersController {
  constructor(
    private readonly servers: ServersService,
    private readonly events: EventsService,
    private readonly operations: OperationsService,
    private readonly updates: UpdatesService,
  ) {}

  @Get('servers')
  @RequirePermissions(PERMISSIONS.SERVERS_VIEW)
  list(@Query(new ZodValidationPipe(listServersQuerySchema)) query: ListServersQuery) {
    return this.servers.list(query);
  }

  @Post('servers')
  @RequirePermissions(PERMISSIONS.SERVERS_CREATE)
  create(
    @Body(new ZodValidationPipe(createServerSchema)) body: CreateServerRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.servers.create(body, user, getRequestId(request));
  }

  @Post('servers/bulk/group')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SERVERS_UPDATE)
  bulkGroup(
    @Body(new ZodValidationPipe(bulkGroupSchema)) body: BulkGroupRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.servers.bulkGroup(body, user, getRequestId(request));
  }

  @Post('servers/bulk/space')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SERVERS_UPDATE)
  bulkSpace(
    @Body(new ZodValidationPipe(bulkSpaceSchema)) body: BulkSpaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.servers.bulkGroup(body, user, getRequestId(request));
  }

  @Post('servers/bulk/tags')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SERVERS_UPDATE)
  bulkTags(
    @Body(new ZodValidationPipe(bulkTagsSchema)) body: BulkTagsRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.servers.bulkTags(body, user, getRequestId(request));
  }

  @Post('servers/bulk/maintenance')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SERVERS_UPDATE)
  bulkMaintenance(
    @Body(new ZodValidationPipe(bulkMaintenanceSchema)) body: BulkMaintenanceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.servers.bulkMaintenance(body, user, getRequestId(request));
  }

  @Post('servers/bulk/operations')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SERVERS_UPDATE)
  bulkOperations(
    @Body(new ZodValidationPipe(bulkOperationsSchema)) body: BulkOperationsRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.operations.bulkCreate(body, user, getRequestId(request));
  }

  @Get('server-tags')
  @RequirePermissions(PERMISSIONS.SERVERS_VIEW)
  tags() {
    return this.servers.listTags();
  }

  @Get('server-audit')
  @RequirePermissions(PERMISSIONS.AUDIT_VIEW)
  auditAll(
    @Query(new ZodValidationPipe(auditQuerySchema)) query: z.infer<typeof auditQuerySchema>,
  ) {
    return this.servers.listAudit(query);
  }

  @Get('servers/:id')
  @RequirePermissions(PERMISSIONS.SERVERS_VIEW)
  get(@Param('id', new ZodValidationPipe(idSchema)) id: string) {
    return this.servers.getById(id);
  }

  @Patch('servers/:id')
  @RequirePermissions(PERMISSIONS.SERVERS_UPDATE)
  update(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(updateServerSchema)) body: UpdateServerRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.servers.update(id, body, user, getRequestId(request));
  }

  @Delete('servers/:id')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SERVERS_DELETE)
  remove(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.servers.remove(id, user, getRequestId(request));
  }

  @Post('servers/:id/enrollment-token')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SERVERS_CREATE)
  enrollmentToken(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.servers.createEnrollmentToken(id, user, getRequestId(request));
  }

  @Post('servers/:id/enrollment-tokens')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SERVERS_CREATE)
  enrollmentTokens(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.servers.createEnrollmentToken(id, user, getRequestId(request));
  }

  @Post('servers/:id/revoke')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SERVERS_DELETE)
  revoke(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.servers.revoke(id, user, getRequestId(request));
  }

  @Post('servers/:id/rotate-credential')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SERVERS_CREATE)
  rotate(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.servers.rotateCredential(id, user, getRequestId(request));
  }

  @Get('servers/:id/agent')
  @RequirePermissions(PERMISSIONS.SERVERS_VIEW)
  agent(@Param('id', new ZodValidationPipe(idSchema)) id: string) {
    return this.servers.agentInfo(id);
  }

  @Post('servers/:id/agent/revoke')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SERVERS_DELETE)
  revokeAgent(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.servers.revoke(id, user, getRequestId(request));
  }

  @Post('servers/:id/agent/rotate')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SERVERS_CREATE)
  rotateAgent(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.servers.rotateCredential(id, user, getRequestId(request));
  }

  @Post('servers/:id/group')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SERVERS_UPDATE)
  assignGroup(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(assignGroupSchema)) body: AssignGroupRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.servers.assignGroup(id, body, user, getRequestId(request));
  }

  @Post('servers/:id/space')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SERVERS_UPDATE)
  assignSpace(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(assignSpaceSchema)) body: AssignSpaceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.servers.assignGroup(id, body, user, getRequestId(request));
  }

  @Post('servers/:id/tags')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SERVERS_UPDATE)
  addTags(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(addTagsSchema)) body: AddTagsRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.servers.addTags(id, body, user, getRequestId(request));
  }

  @Delete('servers/:id/tags/:tag')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SERVERS_UPDATE)
  removeTag(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Param('tag', new ZodValidationPipe(tagSchema)) tag: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.servers.removeTag(id, tag, user, getRequestId(request));
  }

  @Get('servers/:id/metrics')
  @RequirePermissions(PERMISSIONS.SERVERS_VIEW)
  metrics(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Query(new ZodValidationPipe(metricsQuerySchema)) query: MetricsQuery,
  ) {
    return this.servers.metricsFor(id, query);
  }

  @Get('servers/:id/metrics/latest')
  @RequirePermissions(PERMISSIONS.SERVERS_VIEW)
  latestMetrics(@Param('id', new ZodValidationPipe(idSchema)) id: string) {
    return this.servers.latestMetricsFor(id);
  }

  @Get('servers/:id/metrics/history')
  @RequirePermissions(PERMISSIONS.SERVERS_VIEW)
  history(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Query(new ZodValidationPipe(metricsQuerySchema)) query: MetricsQuery,
  ) {
    return this.servers.metricsFor(id, query);
  }

  @Get('servers/:id/health')
  @RequirePermissions(PERMISSIONS.SERVERS_VIEW)
  health(@Param('id', new ZodValidationPipe(idSchema)) id: string) {
    return this.servers.healthFor(id);
  }

  @Get('servers/:id/updates')
  @RequirePermissions(PERMISSIONS.SERVERS_VIEW)
  updatesFor(@Param('id', new ZodValidationPipe(idSchema)) id: string) {
    return this.updates.getForServer(id);
  }

  @Get('servers/:id/events')
  @RequirePermissions(PERMISSIONS.SERVERS_VIEW)
  eventsFor(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Query(new ZodValidationPipe(listEventsQuerySchema)) query: ListEventsQuery,
  ) {
    return this.events.list(query, id);
  }

  @Get('servers/:id/audit')
  @RequirePermissions(PERMISSIONS.SERVERS_VIEW)
  audit(@Param('id', new ZodValidationPipe(idSchema)) id: string) {
    return this.servers.auditFor(id);
  }

  @Post('servers/:id/maintenance')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SERVERS_UPDATE)
  startMaintenance(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @Body(new ZodValidationPipe(maintenanceSchema)) body: MaintenanceRequest,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.servers.startMaintenance(id, body, user, getRequestId(request));
  }

  @Delete('servers/:id/maintenance')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.SERVERS_UPDATE)
  endMaintenance(
    @Param('id', new ZodValidationPipe(idSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.servers.endMaintenance(id, user, getRequestId(request));
  }

  @Get('servers/:id/maintenance')
  @RequirePermissions(PERMISSIONS.SERVERS_VIEW)
  maintenance(@Param('id', new ZodValidationPipe(idSchema)) id: string) {
    return this.servers.maintenanceFor(id);
  }
}
