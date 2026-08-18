import { Injectable } from '@nestjs/common';
import {
  EVENT_SEVERITIES,
  EVENT_TYPES,
  type EventSeverity,
  type ListEventsQuery,
  type ServerEvent,
  type ServerEventListResponse,
} from '@linuxpilot/server-contracts';
import { type Prisma } from '../../generated/prisma-client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

const SENSITIVE = /token|secret|password|cookie|signature|private|authorization/i;

export type EventInput = {
  serverId?: string;
  type: string;
  severity?: EventSeverity;
  source?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: EventInput): Promise<void> {
    await this.prisma.serverEvent.create({
      data: {
        serverId: input.serverId,
        type: input.type,
        severity: input.severity ?? defaultSeverity(input.type),
        source: input.source ?? 'server-service',
        messageKey: `servers.events.${input.type}`,
        metadata: sanitize(input.metadata) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async list(query: ListEventsQuery, serverId?: string): Promise<ServerEventListResponse> {
    const where: Prisma.ServerEventWhereInput = {
      ...(serverId ? { serverId } : {}),
      ...(query.serverId ? { serverId: query.serverId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.q
        ? {
            OR: [
              { type: { contains: query.q, mode: 'insensitive' } },
              { messageKey: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
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
      this.prisma.serverEvent.count({ where }),
      this.prisma.serverEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: rows.map(toEvent),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async latestForServer(serverId: string): Promise<ServerEvent | null> {
    const row = await this.prisma.serverEvent.findFirst({
      where: { serverId },
      orderBy: { createdAt: 'desc' },
    });
    return row ? toEvent(row) : null;
  }

  async deleteOlderThan(retentionDate: Date, limit: number): Promise<number> {
    const old = await this.prisma.serverEvent.findMany({
      where: { createdAt: { lt: retentionDate } },
      select: { id: true },
      take: limit,
    });
    if (old.length === 0) {
      return 0;
    }
    const result = await this.prisma.serverEvent.deleteMany({
      where: { id: { in: old.map((row) => row.id) } },
    });
    return result.count;
  }
}

function toEvent(row: {
  id: string;
  serverId: string | null;
  type: string;
  severity: string;
  source: string;
  messageKey: string;
  metadata: unknown;
  createdAt: Date;
}): ServerEvent {
  return {
    id: row.id,
    serverId: row.serverId,
    type: row.type,
    severity: row.severity,
    source: row.source,
    messageKey: row.messageKey,
    metadata: asSafeRecord(row.metadata),
    createdAt: row.createdAt.toISOString(),
  };
}

function defaultSeverity(type: string): EventSeverity {
  if (
    type === EVENT_TYPES.SERVER_OFFLINE ||
    type === EVENT_TYPES.OPERATION_FAILED ||
    type === EVENT_TYPES.AGENT_REVOKED
  ) {
    return EVENT_SEVERITIES.ERROR;
  }
  if (
    type === EVENT_TYPES.HEALTH_WARNING_STARTED ||
    type === EVENT_TYPES.AGENT_OUTDATED ||
    type === EVENT_TYPES.AGENT_DISCONNECTED
  ) {
    return EVENT_SEVERITIES.WARNING;
  }
  return EVENT_SEVERITIES.INFO;
}

function sanitize(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!metadata) {
    return undefined;
  }
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE.test(key)) {
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      clean[key] = value;
    }
  }
  return clean;
}

function asSafeRecord(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const result: Record<string, string | number | boolean> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
      result[key] = item;
    }
  }
  return result;
}
