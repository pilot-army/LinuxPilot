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
import { SkipThrottle } from '@nestjs/throttler';
import {
  createServerSchema,
  listServersQuerySchema,
  metricsQuerySchema,
  updateServerSchema,
  type CreateServerRequest,
  type ListServersQuery,
  type MetricsQuery,
  type UpdateServerRequest,
} from '@linuxpilot/server-contracts';
import { type Request } from 'express';
import { getRequestId } from '../../common/http/request-context';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AppConfigService } from '../../config/app-config.service';
import { requireAccessToken } from '../auth/access-token';
import { ServerClientService } from './server-client.service';

@Controller('api/v1/servers')
@SkipThrottle({ login: true, refresh: true, agent: true })
export class ServersProxyController {
  constructor(
    private readonly servers: ServerClientService,
    private readonly config: AppConfigService,
  ) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(listServersQuerySchema)) query: ListServersQuery,
    @Req() request: Request,
  ) {
    const search = new URLSearchParams();
    search.set('page', String(query.page));
    search.set('pageSize', String(query.pageSize));
    search.set('sort', query.sort);
    search.set('order', query.order);
    if (query.q) search.set('q', query.q);
    if (query.search) search.set('search', query.search);
    if (query.status) search.set('status', query.status);
    if (query.agentStatus) search.set('agentStatus', query.agentStatus);
    if (query.spaceId) search.set('spaceId', query.spaceId);
    if (query.unassigned) search.set('unassigned', 'true');
    if (query.tag) search.set('tag', query.tag);
    if (query.os) search.set('os', query.os);
    if (query.maintenance !== undefined) search.set('maintenance', String(query.maintenance));
    const path = `/servers?${search.toString()}`;
    const result = await this.servers.request({
      method: 'GET',
      path,
      requestId: getRequestId(request),
      accessToken: this.requireAccess(request),
    });
    return result.payload.data;
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createServerSchema)) body: CreateServerRequest,
    @Req() request: Request,
  ) {
    const result = await this.servers.request({
      method: 'POST',
      path: '/servers',
      requestId: getRequestId(request),
      accessToken: this.requireAccess(request),
      body,
    });
    return result.payload.data;
  }

  @Get(':id')
  async get(@Param('id') id: string, @Req() request: Request) {
    const result = await this.servers.request({
      method: 'GET',
      path: `/servers/${id}`,
      requestId: getRequestId(request),
      accessToken: this.requireAccess(request),
    });
    return result.payload.data;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateServerSchema)) body: UpdateServerRequest,
    @Req() request: Request,
  ) {
    const result = await this.servers.request({
      method: 'PATCH',
      path: `/servers/${id}`,
      requestId: getRequestId(request),
      accessToken: this.requireAccess(request),
      body,
    });
    return result.payload.data;
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string, @Req() request: Request) {
    const result = await this.servers.request({
      method: 'DELETE',
      path: `/servers/${id}`,
      requestId: getRequestId(request),
      accessToken: this.requireAccess(request),
    });
    return result.payload.data;
  }

  @Post(':id/enrollment-token')
  @HttpCode(200)
  async enrollmentToken(@Param('id') id: string, @Req() request: Request) {
    const result = await this.servers.request({
      method: 'POST',
      path: `/servers/${id}/enrollment-token`,
      requestId: getRequestId(request),
      accessToken: this.requireAccess(request),
    });
    return result.payload.data;
  }

  @Post(':id/revoke')
  @HttpCode(200)
  async revoke(@Param('id') id: string, @Req() request: Request) {
    const result = await this.servers.request({
      method: 'POST',
      path: `/servers/${id}/revoke`,
      requestId: getRequestId(request),
      accessToken: this.requireAccess(request),
    });
    return result.payload.data;
  }

  @Post(':id/rotate-credential')
  @HttpCode(200)
  async rotate(@Param('id') id: string, @Req() request: Request) {
    const result = await this.servers.request({
      method: 'POST',
      path: `/servers/${id}/rotate-credential`,
      requestId: getRequestId(request),
      accessToken: this.requireAccess(request),
    });
    return result.payload.data;
  }

  @Get(':id/metrics')
  async metrics(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(metricsQuerySchema)) query: MetricsQuery,
    @Req() request: Request,
  ) {
    const search = new URLSearchParams();
    search.set('limit', String(query.limit));
    if (query.from) search.set('from', query.from.toISOString());
    if (query.to) search.set('to', query.to.toISOString());
    const result = await this.servers.request({
      method: 'GET',
      path: `/servers/${id}/metrics?${search.toString()}`,
      requestId: getRequestId(request),
      accessToken: this.requireAccess(request),
    });
    return result.payload.data;
  }

  @Post(':id/enrollment-tokens')
  @HttpCode(200)
  async enrollmentTokens(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'POST', `/servers/${id}/enrollment-tokens`);
  }

  @Get(':id/agent')
  async agent(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'GET', `/servers/${id}/agent`);
  }

  @Post(':id/agent/revoke')
  @HttpCode(200)
  async revokeAgent(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'POST', `/servers/${id}/agent/revoke`);
  }

  @Post(':id/agent/rotate')
  @HttpCode(200)
  async rotateAgent(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'POST', `/servers/${id}/agent/rotate`);
  }

  @Post(':id/group')
  @HttpCode(200)
  async assignGroup(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'POST', `/servers/${id}/group`, request.body);
  }

  @Post(':id/space')
  @HttpCode(200)
  async assignSpace(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'POST', `/servers/${id}/space`, request.body);
  }

  @Post(':id/tags')
  @HttpCode(200)
  async addTags(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'POST', `/servers/${id}/tags`, request.body);
  }

  @Delete(':id/tags/:tag')
  @HttpCode(200)
  async removeTag(@Param('id') id: string, @Param('tag') tag: string, @Req() request: Request) {
    return this.forward(request, 'DELETE', `/servers/${id}/tags/${encodeURIComponent(tag)}`);
  }

  @Get(':id/metrics/latest')
  async latestMetrics(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'GET', `/servers/${id}/metrics/latest`);
  }

  @Get(':id/metrics/history')
  async history(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'GET', `/servers/${id}/metrics/history${queryString(request)}`);
  }

  @Get(':id/health')
  async health(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'GET', `/servers/${id}/health`);
  }

  @Get(':id/updates')
  async updates(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'GET', `/servers/${id}/updates`);
  }

  @Get(':id/events')
  async events(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'GET', `/servers/${id}/events${queryString(request)}`);
  }

  @Post(':id/maintenance')
  @HttpCode(200)
  async startMaintenance(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'POST', `/servers/${id}/maintenance`, request.body);
  }

  @Delete(':id/maintenance')
  @HttpCode(200)
  async endMaintenance(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'DELETE', `/servers/${id}/maintenance`);
  }

  @Get(':id/maintenance')
  async maintenance(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'GET', `/servers/${id}/maintenance`);
  }

  @Get(':id/operations')
  async operations(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'GET', `/servers/${id}/operations${queryString(request)}`);
  }

  @Post(':id/operations')
  async createOperation(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'POST', `/servers/${id}/operations`, request.body);
  }

  @Get(':id/operations/:operationId')
  async operation(
    @Param('id') id: string,
    @Param('operationId') operationId: string,
    @Req() request: Request,
  ) {
    return this.forward(request, 'GET', `/servers/${id}/operations/${operationId}`);
  }

  @Post('bulk/group')
  @HttpCode(200)
  async bulkGroup(@Req() request: Request) {
    return this.forward(request, 'POST', '/servers/bulk/group', request.body);
  }

  @Post('bulk/space')
  @HttpCode(200)
  async bulkSpace(@Req() request: Request) {
    return this.forward(request, 'POST', '/servers/bulk/space', request.body);
  }

  @Post('bulk/tags')
  @HttpCode(200)
  async bulkTags(@Req() request: Request) {
    return this.forward(request, 'POST', '/servers/bulk/tags', request.body);
  }

  @Post('bulk/maintenance')
  @HttpCode(200)
  async bulkMaintenance(@Req() request: Request) {
    return this.forward(request, 'POST', '/servers/bulk/maintenance', request.body);
  }

  @Post('bulk/operations')
  @HttpCode(200)
  async bulkOperations(@Req() request: Request) {
    return this.forward(request, 'POST', '/servers/bulk/operations', request.body);
  }

  @Get(':id/audit')
  async audit(@Param('id') id: string, @Req() request: Request) {
    const result = await this.servers.request({
      method: 'GET',
      path: `/servers/${id}/audit`,
      requestId: getRequestId(request),
      accessToken: this.requireAccess(request),
    });
    return result.payload.data;
  }

  private async forward(
    request: Request,
    method: 'GET' | 'POST' | 'DELETE' | 'PATCH',
    path: string,
    body?: unknown,
  ) {
    const result = await this.servers.request({
      method,
      path,
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
}

function queryString(request: Request): string {
  const url = request.originalUrl || request.url;
  const index = url.indexOf('?');
  return index >= 0 ? url.slice(index) : '';
}
