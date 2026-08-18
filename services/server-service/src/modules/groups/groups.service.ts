import { Injectable } from '@nestjs/common';
import { type AuthenticatedUser } from '@linuxpilot/auth-contracts';
import { AppError } from '@linuxpilot/common';
import {
  AGENT_STATUSES,
  EVENT_TYPES,
  SERVER_ERROR_CODES,
  SERVER_STATUSES,
  SPACE_ICONS,
  isReservedSpaceSlug,
  slugifySpaceName,
  type AttachServersRequest,
  type CreateSpaceRequest,
  type DeleteSpaceRequest,
  type ServerSpace,
  type ServerSpaceIcon,
  type ServerSpaceListResponse,
  type UpdateSpaceRequest,
} from '@linuxpilot/server-contracts';
import { Prisma } from '../../generated/prisma-client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AUDIT_ACTIONS } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { EventsService } from '../events/events.service';
import { normalizeTags } from '../domain/tags';
import { parseDisks, toNumber } from '../servers/servers.mapper';

type SpaceRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  tags: string[];
  notificationsEnabled: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

type SpaceStats = {
  total: number;
  online: number;
  offline: number;
  warning: number;
  withoutAgent: number;
  averageCpuPercent: number | null;
  averageMemoryPercent: number | null;
  averageDiskPercent: number | null;
  memberNames: string[];
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const emptyStats = (): SpaceStats => ({
  total: 0,
  online: 0,
  offline: 0,
  warning: 0,
  withoutAgent: 0,
  averageCpuPercent: null,
  averageMemoryPercent: null,
  averageDiskPercent: null,
  memberNames: [],
});

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventsService,
  ) {}

  async list(): Promise<ServerSpaceListResponse> {
    const [spaces, unassignedCount, stats] = await Promise.all([
      this.prisma.serverSpace.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.server.count({ where: { deletedAt: null, spaceId: null } }),
      this.collectStats(),
    ]);
    return {
      items: spaces.map((space) => this.toSpace(space, stats.get(space.id) ?? emptyStats())),
      unassignedCount,
      ungroupedCount: unassignedCount,
    };
  }

  async getById(id: string): Promise<ServerSpace> {
    const space = await this.requireGroup(id);
    const stats = await this.collectStats([id]);
    return this.toSpace(space, stats.get(id) ?? emptyStats());
  }

  async getByIdOrSlug(idOrSlug: string): Promise<ServerSpace> {
    const space = await this.requireGroupByIdOrSlug(idOrSlug);
    const stats = await this.collectStats([space.id]);
    return this.toSpace(space, stats.get(space.id) ?? emptyStats());
  }

  async create(body: CreateSpaceRequest, user: AuthenticatedUser, requestId?: string) {
    const slug = body.slug
      ? await this.requireAvailableSlug(body.slug)
      : await this.uniqueSlug(slugifySpaceName(body.name));
    try {
      const space = await this.prisma.$transaction(async (tx) => {
        const created = await tx.serverSpace.create({
          data: {
            name: body.name.trim(),
            slug,
            description: body.description ?? '',
            icon: toIcon(body.icon),
            color: body.color,
            tags: normalizeTags(body.tags ?? []),
            notificationsEnabled: body.notificationsEnabled ?? true,
          },
        });
        if (body.serverIds?.length) {
          await tx.server.updateMany({
            where: { id: { in: body.serverIds }, deletedAt: null },
            data: { spaceId: created.id, version: { increment: 1 } },
          });
        }
        return created;
      });
      await this.audit.record({
        actorId: user.id,
        action: AUDIT_ACTIONS.SPACE_CREATED,
        targetType: 'server-space',
        targetId: space.id,
        requestId,
        metadata: { name: space.name, slug: space.slug },
      });
      if (body.serverIds?.length) {
        await this.events.record({
          type: EVENT_TYPES.SERVER_UPDATED,
          metadata: { spaceAssigned: space.id, count: body.serverIds.length },
        });
      }
      return this.getById(space.id);
    } catch (error) {
      throwUniqueConflict(error);
    }
  }

  async update(id: string, body: UpdateSpaceRequest, user: AuthenticatedUser, requestId?: string) {
    const current = await this.requireGroup(id);
    if (body.version !== undefined && body.version !== current.version) {
      throw new AppError(
        SERVER_ERROR_CODES.VERSION_CONFLICT,
        'Server space was updated by another request',
        409,
      );
    }
    try {
      const updated = await this.prisma.serverSpace.updateMany({
        where: { id, version: current.version },
        data: {
          ...(body.name !== undefined ? { name: body.name.trim() } : {}),
          ...(body.slug !== undefined
            ? { slug: await this.requireAvailableSlug(body.slug, id) }
            : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.icon !== undefined ? { icon: toIcon(body.icon) } : {}),
          ...(body.color !== undefined ? { color: body.color } : {}),
          ...(body.tags !== undefined ? { tags: normalizeTags(body.tags) } : {}),
          ...(body.notificationsEnabled !== undefined
            ? { notificationsEnabled: body.notificationsEnabled }
            : {}),
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) {
        throw new AppError(
          SERVER_ERROR_CODES.VERSION_CONFLICT,
          'Server space was updated by another request',
          409,
        );
      }
      await this.audit.record({
        actorId: user.id,
        action: AUDIT_ACTIONS.SPACE_UPDATED,
        targetType: 'server-space',
        targetId: id,
        requestId,
        metadata: { fields: Object.keys(body).join(',') },
      });
      return this.getById(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throwUniqueConflict(error);
    }
  }

  async remove(
    id: string,
    user: AuthenticatedUser,
    requestId?: string,
    body: DeleteSpaceRequest = {},
  ) {
    await this.requireGroup(id);
    if (body.moveToSpaceId) {
      if (body.moveToSpaceId === id) {
        throw new AppError(
          SERVER_ERROR_CODES.VALIDATION_ERROR,
          'Cannot move servers into the space being deleted',
          400,
        );
      }
      await this.requireGroup(body.moveToSpaceId);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.server.updateMany({
        where: { spaceId: id },
        data: { spaceId: body.moveToSpaceId ?? null, version: { increment: 1 } },
      });
      await tx.serverSpace.delete({ where: { id } });
    });
    await this.audit.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.SPACE_DELETED,
      targetType: 'server-space',
      targetId: id,
      requestId,
      metadata: { moveToSpaceId: body.moveToSpaceId ?? 'unassigned' },
    });
    await this.events.record({ type: EVENT_TYPES.SERVER_UPDATED, metadata: { spaceRemoved: id } });
    return { success: true, deleted: true };
  }

  async attachServers(
    id: string,
    body: AttachServersRequest,
    user: AuthenticatedUser,
    requestId?: string,
  ) {
    await this.requireGroup(id);
    const updated = await this.prisma.server.updateMany({
      where: { id: { in: body.serverIds }, deletedAt: null },
      data: { spaceId: id, version: { increment: 1 } },
    });
    await this.audit.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.SPACE_ASSIGNED,
      targetType: 'server-space',
      targetId: id,
      requestId,
      metadata: { count: updated.count, serverIds: body.serverIds },
    });
    await this.events.record({
      type: EVENT_TYPES.SERVER_UPDATED,
      metadata: { spaceAssigned: id, count: updated.count },
    });
    return this.getById(id);
  }

  async requireGroup(id: string) {
    const space = await this.prisma.serverSpace.findUnique({ where: { id } });
    if (!space) {
      throw new AppError(SERVER_ERROR_CODES.SPACE_NOT_FOUND, 'Server space not found', 404);
    }
    return space;
  }

  async requireGroupByIdOrSlug(idOrSlug: string) {
    const key = idOrSlug.trim();
    const byId = UUID_RE.test(key)
      ? await this.prisma.serverSpace.findUnique({ where: { id: key } })
      : null;
    const space = byId ?? (await this.prisma.serverSpace.findUnique({ where: { slug: key } }));
    if (!space) {
      throw new AppError(SERVER_ERROR_CODES.SPACE_NOT_FOUND, 'Server space not found', 404);
    }
    return space;
  }

  private async requireAvailableSlug(slug: string, excludeId?: string) {
    const existing = await this.prisma.serverSpace.findUnique({ where: { slug } });
    if (existing && existing.id !== excludeId) {
      throw new AppError(SERVER_ERROR_CODES.VALIDATION_ERROR, 'Space slug must be unique', 409);
    }
    return slug;
  }

  private async uniqueSlug(base: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    let slug = base;
    let attempt = 0;
    while (
      isReservedSpaceSlug(slug) ||
      (await client.serverSpace.findUnique({ where: { slug } }))
    ) {
      attempt += 1;
      slug = `${base.slice(0, 70)}-${attempt}`;
    }
    return slug;
  }

  private async collectStats(spaceIds?: string[]): Promise<Map<string, SpaceStats>> {
    const servers = await this.prisma.server.findMany({
      where: {
        deletedAt: null,
        spaceId: spaceIds ? { in: spaceIds } : { not: null },
      },
      select: {
        id: true,
        spaceId: true,
        status: true,
        agentStatus: true,
        name: true,
        hostname: true,
      },
    });
    const bySpace = new Map<string, SpaceStats>();
    const serverIds = servers.map((server) => server.id);
    const metrics = await this.latestMetricAverages(serverIds);

    for (const server of servers) {
      if (!server.spaceId) {
        continue;
      }
      const current = bySpace.get(server.spaceId) ?? emptyStats();
      current.total += 1;
      if (server.status === SERVER_STATUSES.ONLINE) {
        current.online += 1;
      }
      if (server.status === SERVER_STATUSES.OFFLINE) {
        current.offline += 1;
      }
      if (server.status === SERVER_STATUSES.DEGRADED) {
        current.warning += 1;
      }
      if (
        server.status === SERVER_STATUSES.PENDING ||
        server.agentStatus === AGENT_STATUSES.NOT_INSTALLED
      ) {
        current.withoutAgent += 1;
      }
      current.memberNames.push(server.hostname || server.name);
      bySpace.set(server.spaceId, current);
    }

    const cpu = new Map<string, number[]>();
    const memory = new Map<string, number[]>();
    const disk = new Map<string, number[]>();
    for (const server of servers) {
      if (!server.spaceId) {
        continue;
      }
      const metric = metrics.get(server.id);
      if (!metric) {
        continue;
      }
      if (metric.cpu !== null) {
        pushAverage(cpu, server.spaceId, metric.cpu);
      }
      if (metric.memory !== null) {
        pushAverage(memory, server.spaceId, metric.memory);
      }
      if (metric.disk !== null) {
        pushAverage(disk, server.spaceId, metric.disk);
      }
    }
    for (const [spaceId, stats] of bySpace) {
      stats.averageCpuPercent = mean(cpu.get(spaceId));
      stats.averageMemoryPercent = mean(memory.get(spaceId));
      stats.averageDiskPercent = mean(disk.get(spaceId));
    }
    return bySpace;
  }

  private async latestMetricAverages(serverIds: string[]) {
    const map = new Map<
      string,
      { cpu: number | null; memory: number | null; disk: number | null }
    >();
    if (serverIds.length === 0) {
      return map;
    }
    const rows = await this.prisma.$queryRaw<
      Array<{
        serverId: string;
        cpuUsagePercent: Prisma.Decimal | null;
        memoryUsedBytes: bigint | null;
        memoryTotalBytes: bigint | null;
        disks: Prisma.JsonValue;
      }>
    >`
      SELECT DISTINCT ON ("serverId")
        "serverId",
        "cpuUsagePercent",
        "memoryUsedBytes",
        "memoryTotalBytes",
        "disks"
      FROM "ServerMetric"
      WHERE "serverId" = ANY(${serverIds}::uuid[])
      ORDER BY "serverId", "timestamp" DESC
    `;
    for (const row of rows) {
      const disks = parseDisks(row.disks);
      const diskUsed = disks.reduce((sum, item) => sum + (item.excluded ? 0 : item.usedBytes), 0);
      const diskTotal = disks.reduce((sum, item) => sum + (item.excluded ? 0 : item.totalBytes), 0);
      const memoryUsed = toNumber(row.memoryUsedBytes);
      const memoryTotal = toNumber(row.memoryTotalBytes);
      map.set(row.serverId, {
        cpu: toNumber(row.cpuUsagePercent),
        memory:
          memoryUsed !== null && memoryTotal !== null && memoryTotal > 0
            ? Math.min(100, Math.max(0, (memoryUsed / memoryTotal) * 100))
            : null,
        disk: diskTotal > 0 ? Math.min(100, Math.max(0, (diskUsed / diskTotal) * 100)) : null,
      });
    }
    return map;
  }

  private toSpace(space: SpaceRow, stats: SpaceStats): ServerSpace {
    return {
      id: space.id,
      name: space.name,
      slug: space.slug,
      description: space.description,
      icon: toIcon(space.icon),
      color: space.color,
      tags: space.tags,
      notificationsEnabled: space.notificationsEnabled,
      version: space.version,
      createdAt: space.createdAt.toISOString(),
      updatedAt: space.updatedAt.toISOString(),
      serverCount: stats.total,
      onlineCount: stats.online,
      offlineCount: stats.offline,
      warningCount: stats.warning,
      withoutAgentCount: stats.withoutAgent,
      averageCpuPercent: stats.averageCpuPercent,
      averageMemoryPercent: stats.averageMemoryPercent,
      averageDiskPercent: stats.averageDiskPercent,
      memberNames: stats.memberNames,
    };
  }
}

function pushAverage(target: Map<string, number[]>, key: string, value: number) {
  const current = target.get(key) ?? [];
  current.push(value);
  target.set(key, current);
}

function toIcon(value: string | null | undefined): ServerSpaceIcon {
  if (value && (SPACE_ICONS as readonly string[]).includes(value)) {
    return value as ServerSpaceIcon;
  }
  return 'server';
}

function uniqueTarget(error: Prisma.PrismaClientKnownRequestError): string {
  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.map(String).join(',').toLowerCase();
  }
  return String(target ?? '').toLowerCase();
}

function throwUniqueConflict(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    const target = uniqueTarget(error);
    if (target.includes('slug')) {
      throw new AppError(SERVER_ERROR_CODES.VALIDATION_ERROR, 'Space slug must be unique', 409);
    }
    throw new AppError(SERVER_ERROR_CODES.VALIDATION_ERROR, 'Space name must be unique', 409);
  }
  throw error;
}

function mean(values: number[] | undefined): number | null {
  if (!values?.length) {
    return null;
  }
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}
