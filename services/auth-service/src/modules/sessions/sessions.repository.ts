import { Injectable } from '@nestjs/common';
import { type Prisma, type Session } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export type SessionCreateInput = {
  id: string;
  userId: string;
  familyId: string;
  refreshTokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
};

@Injectable()
export class SessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: SessionCreateInput): Promise<Session> {
    return this.prisma.session.create({ data });
  }

  findById(id: string): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { id } });
  }

  findByUserId(userId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findUsedHash(familyId: string, tokenHash: string) {
    return this.prisma.usedRefreshToken.findFirst({
      where: { familyId, tokenHash },
    });
  }

  async rotateIfCurrentHash(input: {
    id: string;
    expectedHash: string;
    nextHash: string;
    familyId: string;
  }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.session.updateMany({
        where: {
          id: input.id,
          refreshTokenHash: input.expectedHash,
          revokedAt: null,
        },
        data: {
          refreshTokenHash: input.nextHash,
          previousRefreshTokenHash: input.expectedHash,
          refreshVersion: { increment: 1 },
          rotatedAt: new Date(),
        },
      });

      if (updated.count !== 1) {
        return false;
      }

      await tx.usedRefreshToken.create({
        data: {
          familyId: input.familyId,
          sessionId: input.id,
          tokenHash: input.expectedHash,
        },
      });

      return true;
    });
  }

  revoke(id: string, revokedAt = new Date()): Promise<Session> {
    return this.prisma.session.update({
      where: { id },
      data: { revokedAt },
    });
  }

  revokeFamily(familyId: string, revokedAt = new Date()): Promise<{ count: number }> {
    return this.prisma.session.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt },
    });
  }

  revokeAllForUser(userId: string, revokedAt = new Date()): Promise<{ count: number }> {
    return this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
  }

  async deleteExpiredBatch(limit: number, now = new Date()): Promise<number> {
    const expired = await this.prisma.session.findMany({
      where: { expiresAt: { lt: now } },
      select: { id: true },
      take: limit,
    });
    if (expired.length === 0) {
      return 0;
    }
    const result = await this.prisma.session.deleteMany({
      where: { id: { in: expired.map((row) => row.id) } },
    });
    return result.count;
  }

  async deleteRevokedBatch(retentionDate: Date, limit: number): Promise<number> {
    const revoked = await this.prisma.session.findMany({
      where: { revokedAt: { not: null, lt: retentionDate } },
      select: { id: true },
      take: limit,
    });
    if (revoked.length === 0) {
      return 0;
    }
    const result = await this.prisma.session.deleteMany({
      where: { id: { in: revoked.map((row) => row.id) } },
    });
    return result.count;
  }

  get client(): PrismaService {
    return this.prisma;
  }
}

export type { Prisma };
