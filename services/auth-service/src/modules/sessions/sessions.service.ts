import { Injectable } from '@nestjs/common';
import { AUTH_ERROR_CODES, type SessionView } from '@linuxpilot/auth-contracts';
import { AppError } from '@linuxpilot/common';
import { type Session } from '@prisma/client';
import { SessionsRepository, type SessionCreateInput } from './sessions.repository';

@Injectable()
export class SessionsService {
  constructor(private readonly sessionsRepository: SessionsRepository) {}

  create(data: SessionCreateInput): Promise<Session> {
    return this.sessionsRepository.create(data);
  }

  getById(id: string): Promise<Session | null> {
    return this.sessionsRepository.findById(id);
  }

  rotateIfCurrentHash(input: {
    id: string;
    expectedHash: string;
    nextHash: string;
    familyId: string;
  }): Promise<boolean> {
    return this.sessionsRepository.rotateIfCurrentHash(input);
  }

  hasUsedRefreshHash(familyId: string, tokenHash: string): Promise<boolean> {
    return this.sessionsRepository.findUsedHash(familyId, tokenHash).then((row) => row !== null);
  }

  async revoke(id: string): Promise<void> {
    const session = await this.sessionsRepository.findById(id);
    if (!session) {
      throw new AppError(AUTH_ERROR_CODES.SESSION_NOT_FOUND, 'Session not found', 404);
    }
    if (!session.revokedAt) {
      await this.sessionsRepository.revoke(id);
    }
  }

  async revokeOwned(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionsRepository.findById(sessionId);
    if (!session || session.userId !== userId) {
      throw new AppError(AUTH_ERROR_CODES.SESSION_NOT_FOUND, 'Session not found', 404);
    }
    if (!session.revokedAt) {
      await this.sessionsRepository.revoke(sessionId);
    }
  }

  revokeFamily(familyId: string): Promise<{ count: number }> {
    return this.sessionsRepository.revokeFamily(familyId);
  }

  revokeAllForUser(userId: string): Promise<{ count: number }> {
    return this.sessionsRepository.revokeAllForUser(userId);
  }

  async listForUser(userId: string, currentSessionId: string): Promise<SessionView[]> {
    const sessions = await this.sessionsRepository.findByUserId(userId);
    return sessions
      .filter((session) => !session.revokedAt)
      .map((session) => ({
        id: session.id,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        expiresAt: session.expiresAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
        current: session.id === currentSessionId,
      }));
  }

  deleteExpiredBatch(limit: number): Promise<number> {
    return this.sessionsRepository.deleteExpiredBatch(limit);
  }

  deleteRevokedBatch(retentionDate: Date, limit: number): Promise<number> {
    return this.sessionsRepository.deleteRevokedBatch(retentionDate, limit);
  }
}
