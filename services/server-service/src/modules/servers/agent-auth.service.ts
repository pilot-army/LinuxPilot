import { Injectable } from '@nestjs/common';
import { AppError, HEADER_NAMES } from '@linuxpilot/common';
import { verifyAgentSignature } from '@linuxpilot/common/agent-auth';
import { SERVER_ERROR_CODES } from '@linuxpilot/server-contracts';
import { serviceAuthTargetFromRequest } from '../../common/security/service-auth';
import { type Request } from 'express';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit.types';
import { ServiceMetrics } from '../observability/service-metrics';

type RequestWithRawBody = Request & { rawBody?: Buffer | string };

export type AgentIdentity = {
  serverId: string;
  credentialId: string;
};

@Injectable()
export class AgentAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly audit: AuditService,
    private readonly metrics: ServiceMetrics,
  ) {}

  async authenticate(request: RequestWithRawBody): Promise<AgentIdentity> {
    const credentialId = request.header(HEADER_NAMES.agentCredentialId);
    const timestamp = request.header(HEADER_NAMES.agentTimestamp);
    const nonce = request.header(HEADER_NAMES.agentNonce);
    const signature = request.header(HEADER_NAMES.agentSignature);
    const raw = request.rawBody ?? '';
    const rawLength = typeof raw === 'string' ? Buffer.byteLength(raw) : raw.length;

    if (rawLength > this.config.env.AGENT_REQUEST_BODY_LIMIT) {
      this.metrics.recordRejectedAgentRequest();
      throw new AppError(
        SERVER_ERROR_CODES.AGENT_BODY_TOO_LARGE,
        'Agent request is too large',
        413,
      );
    }

    if (!credentialId || !timestamp || !nonce || !signature) {
      return this.reject(request, 'missing_headers');
    }
    if (
      !/^[0-9a-f-]{36}$/i.test(credentialId) ||
      !/^\d+$/.test(timestamp) ||
      nonce.length < 16 ||
      nonce.length > 128
    ) {
      return this.reject(request, 'malformed_headers', credentialId);
    }

    const skew = Math.abs(Date.now() - Number(timestamp));
    if (skew > this.config.env.AGENT_TIMESTAMP_WINDOW_MS) {
      return this.reject(request, 'timestamp', credentialId, SERVER_ERROR_CODES.AGENT_TIMESTAMP);
    }

    const expiresAt = new Date(Date.now() + this.config.env.AGENT_TIMESTAMP_WINDOW_MS * 2);
    try {
      await this.prisma.agentNonce.create({ data: { nonce, expiresAt } });
    } catch {
      return this.reject(request, 'replay', credentialId, SERVER_ERROR_CODES.AGENT_REPLAY);
    }

    const credential = await this.prisma.agentCredential.findUnique({
      where: { id: credentialId },
      include: { server: true },
    });
    if (!credential || credential.status !== 'ACTIVE' || credential.server.deletedAt) {
      return this.reject(
        request,
        credential?.status === 'REVOKED' || credential?.status === 'ROTATED'
          ? 'revoked'
          : 'unknown_credential',
        credentialId,
        credential?.status === 'REVOKED' || credential?.status === 'ROTATED'
          ? SERVER_ERROR_CODES.CREDENTIAL_REVOKED
          : SERVER_ERROR_CODES.AGENT_UNAUTHORIZED,
      );
    }
    if (credential.server.status === 'REVOKED') {
      return this.reject(request, 'server_revoked', credentialId, SERVER_ERROR_CODES.REVOKED);
    }

    const target = serviceAuthTargetFromRequest(request.path, request.originalUrl || request.url);
    const valid = verifyAgentSignature(
      credential.publicKey,
      request.method,
      target,
      timestamp,
      nonce,
      signature,
      raw,
    );
    if (!valid) {
      return this.reject(request, 'bad_signature', credentialId);
    }

    return { serverId: credential.serverId, credentialId: credential.id };
  }

  private async reject(
    request: Request,
    reason: string,
    credentialId?: string,
    code: string = SERVER_ERROR_CODES.AGENT_UNAUTHORIZED,
  ): Promise<never> {
    this.metrics.recordRejectedAgentRequest();
    await this.audit.record({
      action: AUDIT_ACTIONS.AGENT_AUTH_FAILED,
      targetType: 'agent',
      targetId: credentialId,
      requestId: (request as Request & { requestId?: string }).requestId,
      metadata: { reason },
    });
    throw new AppError(code, 'Agent authentication failed', 401);
  }
}
