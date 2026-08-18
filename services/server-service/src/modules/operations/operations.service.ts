import { Injectable } from '@nestjs/common';
import { type AuthenticatedUser } from '@linuxpilot/auth-contracts';
import { AppError } from '@linuxpilot/common';
import {
  EVENT_TYPES,
  OPERATION_STATUSES,
  SERVER_ERROR_CODES,
  type BulkOperationsRequest,
  type CreateOperationRequest,
  type ListOperationsQuery,
  type OperationResultRequest,
  type ServerOperation,
  type ServerOperationListResponse,
} from '@linuxpilot/server-contracts';
import { Prisma } from '../../generated/prisma-client';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit.types';
import { canTransition } from '../domain/operations';
import { EventsService } from '../events/events.service';

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly audit: AuditService,
    private readonly events: EventsService,
  ) {}

  async create(
    serverId: string,
    body: CreateOperationRequest,
    user: AuthenticatedUser,
    requestId?: string,
  ): Promise<ServerOperation> {
    await this.requireActiveServer(serverId);
    if (body.idempotencyKey) {
      const existing = await this.prisma.serverOperation.findUnique({
        where: { serverId_idempotencyKey: { serverId, idempotencyKey: body.idempotencyKey } },
      });
      if (existing) {
        return this.toOperation(existing);
      }
    }
    const parallel = await this.prisma.serverOperation.count({
      where: {
        serverId,
        status: {
          in: [
            OPERATION_STATUSES.PENDING,
            OPERATION_STATUSES.DELIVERED,
            OPERATION_STATUSES.RUNNING,
          ],
        },
      },
    });
    if (parallel >= this.config.env.OPERATION_MAX_PARALLEL) {
      throw new AppError(
        SERVER_ERROR_CODES.OPERATION_NOT_ALLOWED,
        'Too many concurrent operations',
        409,
      );
    }
    const created = await this.prisma.serverOperation.create({
      data: {
        serverId,
        type: body.type,
        payload: (body.payload ?? {}) as Prisma.InputJsonValue,
        requestedBy: user.id,
        idempotencyKey: body.idempotencyKey,
        expiresAt: new Date(Date.now() + this.config.env.OPERATION_TTL_MS),
      },
    });
    await this.audit.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.OPERATION_REQUESTED,
      targetType: 'server-operation',
      targetId: created.id,
      serverId,
      requestId,
      metadata: { type: body.type },
    });
    await this.events.record({
      serverId,
      type: EVENT_TYPES.OPERATION_REQUESTED,
      metadata: { operationId: created.id, type: body.type },
    });
    return this.toOperation(created);
  }

  async list(query: ListOperationsQuery, serverId?: string): Promise<ServerOperationListResponse> {
    const where: Prisma.ServerOperationWhereInput = {
      ...(serverId ? { serverId } : {}),
      ...(query.serverId ? { serverId: query.serverId } : {}),
      ...(query.type ? { type: query.type as never } : {}),
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.requestedBy ? { requestedBy: query.requestedBy } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.serverOperation.count({ where }),
      this.prisma.serverOperation.findMany({
        where,
        include: { server: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: rows.map((row) => this.toOperation(row, row.server.name)),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async getById(serverId: string, operationId: string): Promise<ServerOperation> {
    const row = await this.prisma.serverOperation.findFirst({
      where: { id: operationId, serverId },
    });
    if (!row) {
      throw new AppError(SERVER_ERROR_CODES.NOT_FOUND, 'Operation not found', 404);
    }
    return this.toOperation(row);
  }

  async nextForAgent(serverId: string): Promise<ServerOperation | null> {
    const claimed = await this.prisma.$transaction(async (tx) => {
      const next = await tx.serverOperation.findFirst({
        where: {
          serverId,
          status: OPERATION_STATUSES.PENDING,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'asc' },
      });
      if (!next) {
        return null;
      }
      const updated = await tx.serverOperation.updateMany({
        where: { id: next.id, status: OPERATION_STATUSES.PENDING, version: next.version },
        data: {
          status: OPERATION_STATUSES.DELIVERED,
          deliveredAt: new Date(),
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) {
        return null;
      }
      return tx.serverOperation.findUniqueOrThrow({ where: { id: next.id } });
    });
    return claimed ? this.toOperation(claimed) : null;
  }

  async ack(serverId: string, operationId: string): Promise<ServerOperation> {
    return this.transition(serverId, operationId, OPERATION_STATUSES.RUNNING, {
      startedAt: new Date(),
    });
  }

  async result(
    serverId: string,
    operationId: string,
    body: OperationResultRequest,
  ): Promise<ServerOperation> {
    const next = body.success ? OPERATION_STATUSES.SUCCEEDED : OPERATION_STATUSES.FAILED;
    const updated = await this.transition(serverId, operationId, next, {
      completedAt: new Date(),
      errorCode: body.errorCode,
      result: sanitizeResult(body.result),
    });
    await this.events.record({
      serverId,
      type: body.success ? EVENT_TYPES.OPERATION_SUCCEEDED : EVENT_TYPES.OPERATION_FAILED,
      metadata: { operationId, type: updated.type },
    });
    return updated;
  }

  async cancel(serverId: string, operationId: string, user: AuthenticatedUser, requestId?: string) {
    const updated = await this.transition(serverId, operationId, OPERATION_STATUSES.CANCELLED, {
      completedAt: new Date(),
    });
    await this.audit.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.OPERATION_CANCELLED,
      targetType: 'server-operation',
      targetId: operationId,
      serverId,
      requestId,
    });
    return updated;
  }

  async expireBatch(): Promise<number> {
    const stale = await this.prisma.serverOperation.findMany({
      where: {
        status: {
          in: [
            OPERATION_STATUSES.PENDING,
            OPERATION_STATUSES.DELIVERED,
            OPERATION_STATUSES.RUNNING,
          ],
        },
        expiresAt: { lt: new Date() },
      },
      take: 200,
    });
    let count = 0;
    for (const row of stale) {
      const updated = await this.prisma.serverOperation.updateMany({
        where: { id: row.id, status: row.status, version: row.version },
        data: {
          status: OPERATION_STATUSES.EXPIRED,
          completedAt: new Date(),
          version: { increment: 1 },
        },
      });
      count += updated.count;
    }
    return count;
  }

  async bulkCreate(body: BulkOperationsRequest, user: AuthenticatedUser, requestId?: string) {
    const results = [];
    for (const serverId of body.serverIds) {
      try {
        const operation = await this.create(
          serverId,
          {
            type: body.type,
            payload: body.payload,
            idempotencyKey: body.idempotencyKey ? `${body.idempotencyKey}:${serverId}` : undefined,
          },
          user,
          requestId,
        );
        results.push({ serverId, success: true, operationId: operation.id });
      } catch (error) {
        results.push({
          serverId,
          success: false,
          errorCode: error instanceof AppError ? error.code : SERVER_ERROR_CODES.INTERNAL_ERROR,
        });
      }
    }
    return { results };
  }

  private async transition(
    serverId: string,
    operationId: string,
    next: (typeof OPERATION_STATUSES)[keyof typeof OPERATION_STATUSES],
    extra: Prisma.ServerOperationUpdateManyMutationInput,
  ) {
    const current = await this.prisma.serverOperation.findFirst({
      where: { id: operationId, serverId },
    });
    if (!current) {
      throw new AppError(SERVER_ERROR_CODES.NOT_FOUND, 'Operation not found', 404);
    }
    if (current.status === next) {
      return this.toOperation(current);
    }
    if (!canTransition(current.status, next)) {
      throw new AppError(SERVER_ERROR_CODES.OPERATION_CONFLICT, 'Operation state conflict', 409);
    }
    const updated = await this.prisma.serverOperation.updateMany({
      where: { id: operationId, serverId, status: current.status, version: current.version },
      data: { status: next, version: { increment: 1 }, ...extra },
    });
    if (updated.count === 0) {
      throw new AppError(SERVER_ERROR_CODES.OPERATION_CONFLICT, 'Operation state conflict', 409);
    }
    return this.toOperation(
      await this.prisma.serverOperation.findUniqueOrThrow({ where: { id: operationId } }),
    );
  }

  private async requireActiveServer(serverId: string) {
    const server = await this.prisma.server.findFirst({
      where: { id: serverId, deletedAt: null },
    });
    if (!server) {
      throw new AppError(SERVER_ERROR_CODES.NOT_FOUND, 'Server not found', 404);
    }
    if (server.status === 'REVOKED') {
      throw new AppError(SERVER_ERROR_CODES.REVOKED, 'Server is revoked', 403);
    }
    if (!server.currentCredentialId) {
      throw new AppError(SERVER_ERROR_CODES.AGENT_NOT_ENROLLED, 'Agent is not enrolled', 409);
    }
  }

  private toOperation(
    row: {
      id: string;
      serverId: string;
      type: ServerOperation['type'];
      status: ServerOperation['status'];
      requestedBy: string | null;
      idempotencyKey: string | null;
      payload: unknown;
      createdAt: Date;
      deliveredAt: Date | null;
      startedAt: Date | null;
      completedAt: Date | null;
      expiresAt: Date;
      errorCode: string | null;
      result: unknown;
      version: number;
    },
    serverName?: string | null,
  ): ServerOperation {
    return {
      id: row.id,
      serverId: row.serverId,
      serverName,
      type: row.type,
      status: row.status,
      requestedBy: row.requestedBy,
      idempotencyKey: row.idempotencyKey,
      payload: asRecord(row.payload),
      createdAt: row.createdAt.toISOString(),
      deliveredAt: row.deliveredAt?.toISOString() ?? null,
      startedAt: row.startedAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      expiresAt: row.expiresAt.toISOString(),
      errorCode: row.errorCode,
      result: row.result && typeof row.result === 'object' ? asRecord(row.result) : null,
      version: row.version,
    };
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function sanitizeResult(value?: Record<string, unknown>): Prisma.InputJsonValue {
  const clean: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value ?? {})) {
    if (/token|secret|password|signature|private/i.test(key)) {
      continue;
    }
    if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
      clean[key] = item;
    }
  }
  return clean as Prisma.InputJsonValue;
}
