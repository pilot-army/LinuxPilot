import { Body, Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import {
  agentHeartbeatSchema,
  agentMetricsSchema,
  agentUpdateStatusSchema,
  enrollAgentSchema,
  operationResultSchema,
  rotateAgentSchema,
  type AgentHeartbeatRequest,
  type AgentMetricsRequest,
  type AgentUpdateStatusRequest,
  type EnrollAgentRequest,
  type OperationResultRequest,
  type RotateAgentRequest,
} from '@linuxpilot/server-contracts';
import { z } from 'zod';
import { type Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { getRequestId } from '../../common/http/request-context';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { OperationsService } from '../operations/operations.service';
import { UpdatesService } from '../updates/updates.service';
import { AgentAuthService } from './agent-auth.service';
import { ServersService } from './servers.service';

const idSchema = z.string().uuid();

@Controller('api/v1/agent')
export class AgentController {
  constructor(
    private readonly servers: ServersService,
    private readonly agentAuth: AgentAuthService,
    private readonly operations: OperationsService,
    private readonly updates: UpdatesService,
  ) {}

  @Public()
  @Post('enroll')
  @HttpCode(200)
  enroll(
    @Body(new ZodValidationPipe(enrollAgentSchema)) body: EnrollAgentRequest,
    @Req() request: Request,
  ) {
    return this.servers.enroll({
      ...body,
      requestId: getRequestId(request),
    });
  }

  @Public()
  @Post('heartbeat')
  @HttpCode(200)
  async heartbeat(
    @Body(new ZodValidationPipe(agentHeartbeatSchema)) body: AgentHeartbeatRequest,
    @Req() request: Request,
  ) {
    const identity = await this.agentAuth.authenticate(request);
    return this.servers.heartbeat(
      identity.serverId,
      identity.credentialId,
      body,
      getRequestId(request),
    );
  }

  @Public()
  @Post('metrics')
  @HttpCode(200)
  async metrics(
    @Body(new ZodValidationPipe(agentMetricsSchema)) body: AgentMetricsRequest,
    @Req() request: Request,
  ) {
    const identity = await this.agentAuth.authenticate(request);
    return this.servers.ingestMetrics(identity.serverId, body);
  }

  @Public()
  @Post('update-status')
  @HttpCode(200)
  async updateStatus(
    @Body(new ZodValidationPipe(agentUpdateStatusSchema)) body: AgentUpdateStatusRequest,
    @Req() request: Request,
  ) {
    const identity = await this.agentAuth.authenticate(request);
    await this.updates.upsertFromAgent(identity.serverId, body);
    return { accepted: true };
  }

  @Public()
  @Post('rotate')
  @HttpCode(200)
  async rotate(
    @Body(new ZodValidationPipe(rotateAgentSchema)) body: RotateAgentRequest,
    @Req() request: Request,
  ) {
    const identity = await this.agentAuth.authenticate(request);
    return this.servers.rotateFromAgent(identity.serverId, body.publicKey, getRequestId(request));
  }

  @Public()
  @Get('operations/next')
  async nextOperation(@Req() request: Request) {
    const identity = await this.agentAuth.authenticate(request);
    return this.operations.nextForAgent(identity.serverId);
  }

  @Public()
  @Post('operations/:operationId/ack')
  @HttpCode(200)
  async ack(
    @Param('operationId', new ZodValidationPipe(idSchema)) operationId: string,
    @Req() request: Request,
  ) {
    const identity = await this.agentAuth.authenticate(request);
    return this.operations.ack(identity.serverId, operationId);
  }

  @Public()
  @Post('operations/:operationId/result')
  @HttpCode(200)
  async result(
    @Param('operationId', new ZodValidationPipe(idSchema)) operationId: string,
    @Body(new ZodValidationPipe(operationResultSchema)) body: OperationResultRequest,
    @Req() request: Request,
  ) {
    const identity = await this.agentAuth.authenticate(request);
    return this.operations.result(identity.serverId, operationId, body);
  }
}
