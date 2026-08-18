import { Injectable } from '@nestjs/common';
import { type Prisma } from '../../generated/prisma-client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { type AuditEntry } from './audit.types';

const SENSITIVE_METADATA_KEYS = new Set([
  'password',
  'refreshToken',
  'accessToken',
  'token',
  'secret',
  'cookie',
  'authorization',
  'enrollmentToken',
  'signature',
  'privateKey',
  'privateKeyPem',
  'passphrase',
  'encryptedPrivateKey',
  'encryptedPassphrase',
  'wrappedDek',
  'dek',
  'nonce',
  'publicKey',
]);

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.prisma.serverAuditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        serverId: entry.serverId,
        requestId: entry.requestId,
        ipAddress: entry.ipAddress,
        metadata: entry.metadata
          ? (sanitizeMetadata(entry.metadata) as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  async listForServer(serverId: string, limit = 50) {
    return this.prisma.serverAuditLog.findMany({
      where: { serverId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });
  }

  async list(query: {
    page: number;
    pageSize: number;
    serverId?: string;
    actorId?: string;
    action?: string;
    result?: string;
    from?: Date;
    to?: Date;
  }) {
    const where = {
      ...(query.serverId ? { serverId: query.serverId } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' as const } } : {}),
      ...(query.result ? { result: query.result } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.serverAuditLog.count({ where }),
      this.prisma.serverAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async deleteOlderThan(retentionDate: Date, limit: number): Promise<number> {
    const old = await this.prisma.serverAuditLog.findMany({
      where: { createdAt: { lt: retentionDate } },
      select: { id: true },
      take: limit,
    });
    if (old.length === 0) {
      return 0;
    }
    const result = await this.prisma.serverAuditLog.deleteMany({
      where: { id: { in: old.map((row) => row.id) } },
    });
    return result.count;
  }
}

export function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (
      SENSITIVE_METADATA_KEYS.has(key) ||
      /token|secret|password|cookie|signature|private/i.test(key)
    ) {
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      clean[key] = value;
    }
  }
  return clean;
}
