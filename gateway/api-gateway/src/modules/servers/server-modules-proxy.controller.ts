import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { type Request } from 'express';
import { getRequestId } from '../../common/http/request-context';
import { AppConfigService } from '../../config/app-config.service';
import { requireAccessToken } from '../auth/access-token';
import { ServerClientService } from './server-client.service';

@Controller('api/v1')
@SkipThrottle({ login: true, refresh: true, agent: true })
export class ServerModulesProxyController {
  constructor(
    private readonly servers: ServerClientService,
    private readonly config: AppConfigService,
  ) {}

  @Get('server-groups')
  listGroups(@Req() request: Request) {
    return this.forward(request, 'GET', '/server-groups');
  }

  @Get('server-spaces')
  listSpaces(@Req() request: Request) {
    return this.forward(request, 'GET', '/server-spaces');
  }

  @Get('server-groups/:id')
  getGroup(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'GET', `/server-groups/${id}`);
  }

  @Get('server-spaces/:id')
  getSpace(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'GET', `/server-spaces/${id}`);
  }

  @Post('server-groups')
  createGroup(@Req() request: Request, @Body() body: unknown) {
    return this.forward(request, 'POST', '/server-groups', body);
  }

  @Post('server-spaces')
  createSpace(@Req() request: Request, @Body() body: unknown) {
    return this.forward(request, 'POST', '/server-spaces', body);
  }

  @Patch('server-groups/:id')
  updateGroup(@Param('id') id: string, @Req() request: Request, @Body() body: unknown) {
    return this.forward(request, 'PATCH', `/server-groups/${id}`, body);
  }

  @Patch('server-spaces/:id')
  updateSpace(@Param('id') id: string, @Req() request: Request, @Body() body: unknown) {
    return this.forward(request, 'PATCH', `/server-spaces/${id}`, body);
  }

  @Delete('server-groups/:id')
  @HttpCode(200)
  deleteGroup(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'DELETE', `/server-groups/${id}`, request.body);
  }

  @Delete('server-spaces/:id')
  @HttpCode(200)
  deleteSpace(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'DELETE', `/server-spaces/${id}`, request.body);
  }

  @Post('server-spaces/:id/servers')
  @HttpCode(200)
  attachSpaceServers(@Param('id') id: string, @Req() request: Request, @Body() body: unknown) {
    return this.forward(request, 'POST', `/server-spaces/${id}/servers`, body);
  }

  @Post('server-spaces/:id/move-servers')
  @HttpCode(200)
  moveSpaceServers(@Param('id') id: string, @Req() request: Request, @Body() body: unknown) {
    return this.forward(request, 'POST', `/server-spaces/${id}/move-servers`, body);
  }

  @Get('server-tags')
  tags(@Req() request: Request) {
    return this.forward(request, 'GET', '/server-tags');
  }

  @Get('server-events')
  events(@Req() request: Request) {
    return this.forward(request, 'GET', `/server-events${queryString(request)}`);
  }

  @Get('server-operations')
  operations(@Req() request: Request) {
    return this.forward(request, 'GET', `/server-operations${queryString(request)}`);
  }

  @Get('server-audit')
  audit(@Req() request: Request) {
    return this.forward(request, 'GET', `/server-audit${queryString(request)}`);
  }

  @Get('ssh-keys')
  listSshKeys(@Req() request: Request) {
    return this.forward(request, 'GET', `/ssh-keys${queryString(request)}`);
  }

  @Post('ssh-keys/inspect')
  @HttpCode(200)
  inspectSshKey(@Req() request: Request, @Body() body: unknown) {
    return this.forward(request, 'POST', '/ssh-keys/inspect', body);
  }

  @Post('ssh-keys/import')
  importSshKey(@Req() request: Request, @Body() body: unknown) {
    return this.forward(request, 'POST', '/ssh-keys/import', body);
  }

  @Post('ssh-keys/public')
  addPublicSshKey(@Req() request: Request, @Body() body: unknown) {
    return this.forward(request, 'POST', '/ssh-keys/public', body);
  }

  @Post('ssh-keys/generate')
  generateSshKey(@Req() request: Request, @Body() body: unknown) {
    return this.forward(request, 'POST', '/ssh-keys/generate', body);
  }

  @Get('ssh-keys/:id')
  getSshKey(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'GET', `/ssh-keys/${id}`);
  }

  @Get('ssh-keys/:id/usages')
  getSshKeyUsages(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'GET', `/ssh-keys/${id}/usages`);
  }

  @Patch('ssh-keys/:id')
  updateSshKey(@Param('id') id: string, @Req() request: Request, @Body() body: unknown) {
    return this.forward(request, 'PATCH', `/ssh-keys/${id}`, body);
  }

  @Post('ssh-keys/:id/disable')
  @HttpCode(200)
  disableSshKey(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'POST', `/ssh-keys/${id}/disable`);
  }

  @Post('ssh-keys/:id/install')
  @HttpCode(200)
  installSshKey(@Param('id') id: string, @Req() request: Request, @Body() body: unknown) {
    return this.forward(request, 'POST', `/ssh-keys/${id}/install`, body);
  }

  @Post('ssh-keys/:id/rotate')
  @HttpCode(200)
  rotateSshKey(@Param('id') id: string, @Req() request: Request, @Body() body: unknown) {
    return this.forward(request, 'POST', `/ssh-keys/${id}/rotate`, body);
  }

  @Delete('ssh-keys/:id')
  @HttpCode(200)
  deleteSshKey(@Param('id') id: string, @Req() request: Request) {
    return this.forward(request, 'DELETE', `/ssh-keys/${id}`);
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
      accessToken: requireAccessToken(
        request,
        this.config.env.JWT_ACCESS_PUBLIC_KEY,
        this.config.env.JWT_ISSUER,
        this.config.env.JWT_AUDIENCE,
      ),
      body,
    });
    return result.payload.data;
  }
}

function queryString(request: Request): string {
  const url = request.originalUrl || request.url;
  const index = url.indexOf('?');
  return index >= 0 ? url.slice(index) : '';
}
