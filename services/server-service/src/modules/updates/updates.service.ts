import { Injectable } from '@nestjs/common';
import { AppError } from '@linuxpilot/common';
import {
  SERVER_ERROR_CODES,
  type AgentUpdateStatusRequest,
  type ServerUpdateStatus,
} from '@linuxpilot/server-contracts';
import { type Prisma } from '../../generated/prisma-client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class UpdatesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertFromAgent(serverId: string, body: AgentUpdateStatusRequest): Promise<void> {
    await this.prisma.serverUpdateStatus.upsert({
      where: { serverId },
      create: {
        serverId,
        availableUpdates: body.availableUpdates,
        securityUpdates: body.securityUpdates,
        lastCheckedAt: body.lastCheckedAt ?? new Date(),
        rebootRequired: body.rebootRequired,
        packages: body.packages as Prisma.InputJsonValue,
        currentAgentVersion: body.currentAgentVersion,
        availableAgentVersion: body.availableAgentVersion,
      },
      update: {
        availableUpdates: body.availableUpdates,
        securityUpdates: body.securityUpdates,
        lastCheckedAt: body.lastCheckedAt ?? new Date(),
        rebootRequired: body.rebootRequired,
        packages: body.packages as Prisma.InputJsonValue,
        currentAgentVersion: body.currentAgentVersion,
        availableAgentVersion: body.availableAgentVersion,
      },
    });
  }

  async getForServer(serverId: string): Promise<ServerUpdateStatus> {
    const server = await this.prisma.server.findFirst({
      where: { id: serverId, deletedAt: null },
    });
    if (!server) {
      throw new AppError(SERVER_ERROR_CODES.NOT_FOUND, 'Server not found', 404);
    }
    const row = await this.prisma.serverUpdateStatus.findUnique({ where: { serverId } });
    if (!row) {
      return {
        availableUpdates: 0,
        securityUpdates: 0,
        lastCheckedAt: null,
        rebootRequired: false,
        packages: [],
        currentAgentVersion: server.agentVersion,
        availableAgentVersion: null,
      };
    }
    return {
      availableUpdates: row.availableUpdates,
      securityUpdates: row.securityUpdates,
      lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
      rebootRequired: row.rebootRequired,
      packages: Array.isArray(row.packages) ? (row.packages as ServerUpdateStatus['packages']) : [],
      currentAgentVersion: row.currentAgentVersion ?? server.agentVersion,
      availableAgentVersion: row.availableAgentVersion,
    };
  }
}
