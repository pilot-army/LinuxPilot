import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
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
  'refreshTokenHash',
  'passwordHash',
]);

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        requestId: entry.requestId,
        ipAddress: entry.ipAddress,
        metadata: entry.metadata
          ? (sanitizeMetadata(entry.metadata) as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  async deleteOlderThan(retentionDate: Date, limit: number): Promise<number> {
    const old = await this.prisma.auditLog.findMany({
      where: { createdAt: { lt: retentionDate } },
      select: { id: true },
      take: limit,
    });
    if (old.length === 0) {
      return 0;
    }
    const result = await this.prisma.auditLog.deleteMany({
      where: { id: { in: old.map((row) => row.id) } },
    });
    return result.count;
  }
}

function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_METADATA_KEYS.has(key) || /token|secret|password|cookie/i.test(key)) {
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      clean[key] = value;
    }
  }
  return clean;
}
