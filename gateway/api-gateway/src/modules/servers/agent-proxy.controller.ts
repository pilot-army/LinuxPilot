import { Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { HEADER_NAMES } from '@linuxpilot/common';
import { type Request } from 'express';
import { getRequestId } from '../../common/http/request-context';
import { ServerClientService } from './server-client.service';

type RequestWithRawBody = Request & { rawBody?: Buffer | string };

@Controller('api/v1/agent')
@SkipThrottle({ default: true, login: true, refresh: true })
export class AgentProxyController {
  constructor(private readonly servers: ServerClientService) {}

  @Post('enroll')
  @HttpCode(200)
  @SkipThrottle({ agent: false })
  enroll(@Req() request: RequestWithRawBody) {
    return this.forward(request, '/api/v1/agent/enroll');
  }

  @Post('heartbeat')
  @HttpCode(200)
  @SkipThrottle({ agent: false })
  heartbeat(@Req() request: RequestWithRawBody) {
    return this.forward(request, '/api/v1/agent/heartbeat');
  }

  @Post('rotate')
  @HttpCode(200)
  @SkipThrottle({ agent: false })
  rotate(@Req() request: RequestWithRawBody) {
    return this.forward(request, '/api/v1/agent/rotate');
  }

  @Post('metrics')
  @HttpCode(200)
  @SkipThrottle({ agent: false })
  metrics(@Req() request: RequestWithRawBody) {
    return this.forward(request, '/api/v1/agent/metrics');
  }

  @Post('update-status')
  @HttpCode(200)
  @SkipThrottle({ agent: false })
  updateStatus(@Req() request: RequestWithRawBody) {
    return this.forward(request, '/api/v1/agent/update-status');
  }

  @Get('operations/next')
  @SkipThrottle({ agent: false })
  next(@Req() request: RequestWithRawBody) {
    return this.forward(request, '/api/v1/agent/operations/next', 'GET');
  }

  @Post('operations/:operationId/ack')
  @HttpCode(200)
  @SkipThrottle({ agent: false })
  ack(@Param('operationId') operationId: string, @Req() request: RequestWithRawBody) {
    return this.forward(request, `/api/v1/agent/operations/${operationId}/ack`);
  }

  @Post('operations/:operationId/result')
  @HttpCode(200)
  @SkipThrottle({ agent: false })
  result(@Param('operationId') operationId: string, @Req() request: RequestWithRawBody) {
    return this.forward(request, `/api/v1/agent/operations/${operationId}/result`);
  }

  private async forward(
    request: RequestWithRawBody,
    path: string,
    method: 'GET' | 'POST' = 'POST',
  ) {
    const extraHeaders: Record<string, string> = {};
    for (const name of [
      HEADER_NAMES.agentCredentialId,
      HEADER_NAMES.agentTimestamp,
      HEADER_NAMES.agentNonce,
      HEADER_NAMES.agentSignature,
    ]) {
      const value = request.header(name);
      if (typeof value === 'string' && value.length > 0) {
        extraHeaders[name] = value;
      }
    }
    const result = await this.servers.request({
      method,
      path,
      requestId: getRequestId(request),
      rawBody: method === 'GET' ? '' : (request.rawBody ?? JSON.stringify(request.body ?? {})),
      extraHeaders,
    });
    return result.payload.data;
  }
}
