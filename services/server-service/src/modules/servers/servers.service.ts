import { Injectable } from '@nestjs/common';
import { type AuthenticatedUser } from '@linuxpilot/auth-contracts';
import { AppError, sanitizeIpAddress } from '@linuxpilot/common';
import { generateEnrollmentToken, hashEnrollmentToken } from '@linuxpilot/common/agent-auth';
import {
  EVENT_TYPES,
  SERVER_ERROR_CODES,
  SERVER_STATUSES,
  type AddTagsRequest,
  type AgentHeartbeatRequest,
  type AgentInfo,
  type AgentMetricsRequest,
  type AssignGroupRequest,
  type BulkGroupRequest,
  type BulkMaintenanceRequest,
  type BulkTagsRequest,
  type CreateServerRequest,
  type DiskMetric,
  type EnrollmentTokenResponse,
  type ListServersQuery,
  type MaintenanceInfo,
  type MaintenanceRequest,
  type MetricsQuery,
  type ServerAuditResponse,
  type ServerDetail,
  type ServerHealth,
  type ServerListResponse,
  type ServerMetricsResponse,
  type ServerStatus,
  UNKNOWN_SYSTEM_VALUE,
  type UpdateServerRequest,
} from '@linuxpilot/server-contracts';
import { Prisma } from '../../generated/prisma-client';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit.types';
import { computeHealth, healthReasonCodes } from '../domain/health';
import { computeStatuses, persistedServerStatus } from '../domain/status';
import { normalizeArchitecture, normalizeOsField } from '../domain/system-info';
import { mergeTags, normalizeTag, normalizeTags, removeTags } from '../domain/tags';
import { EventsService } from '../events/events.service';
import { GroupsService } from '../groups/groups.service';
import { ServiceMetrics } from '../observability/service-metrics';
import {
  parseDisks,
  toAuditEvent,
  toDetail,
  toMetricPoint,
  toNumber,
  toSummary,
} from './servers.mapper';

const SORT_MAP = {
  name: 'name',
  hostname: 'hostname',
  status: 'status',
  lastSeenAt: 'lastSeenAt',
  createdAt: 'createdAt',
} as const;

@Injectable()
export class ServersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly audit: AuditService,
    private readonly metrics: ServiceMetrics,
    private readonly events: EventsService,
    private readonly groups: GroupsService,
  ) {}

  async list(query: ListServersQuery): Promise<ServerListResponse> {
    const search = query.q ?? query.search;
    const where: Prisma.ServerWhereInput = {
      deletedAt: null,
      ...this.statusFilter(query.status),
      ...(query.agentStatus ? { agentStatus: query.agentStatus } : {}),
      ...(query.unassigned ? { spaceId: null } : query.spaceId ? { spaceId: query.spaceId } : {}),
      ...(query.tag ? { tags: { has: normalizeTag(query.tag) } } : {}),
      ...(query.os ? { osName: { contains: query.os, mode: 'insensitive' } } : {}),
      ...(query.maintenance !== undefined ? { maintenanceMode: query.maintenance } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { hostname: { contains: search, mode: 'insensitive' } },
              { primaryIp: { contains: search, mode: 'insensitive' } },
              { tags: { has: normalizeTag(search) } },
            ],
          }
        : {}),
    };
    const sortField = SORT_MAP[query.sort] ?? 'createdAt';
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.server.count({ where }),
      this.prisma.server.findMany({
        where,
        include: { space: true },
        orderBy: { [sortField]: query.order },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    const latest = await this.latestMetrics(rows.map((row) => row.id));
    return {
      items: rows.map((row) =>
        toSummary(
          row,
          this.config.env.OFFLINE_TIMEOUT_MS,
          latest.get(row.id),
          this.config.env.AGENT_MIN_SUPPORTED_VERSION,
        ),
      ),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async getById(id: string): Promise<ServerDetail> {
    const server = await this.requireServer(id, false, true);
    const latest = await this.prisma.serverMetric.findFirst({
      where: { serverId: id },
      orderBy: { timestamp: 'desc' },
    });
    return toDetail(
      server,
      this.config.env.OFFLINE_TIMEOUT_MS,
      latest,
      this.config.env.AGENT_MIN_SUPPORTED_VERSION,
    );
  }

  async create(
    body: CreateServerRequest,
    user: AuthenticatedUser,
    requestId?: string,
  ): Promise<ServerDetail> {
    if (body.spaceId) {
      await this.groups.requireGroup(body.spaceId);
    }
    if (body.sshKeyId) {
      await this.requireUsableSshKey(body.sshKeyId);
    }
    const autoDetectSystem = body.autoDetectSystem !== false;
    const server = await this.prisma.server.create({
      data: {
        name: body.name,
        description: body.description ?? '',
        hostname: body.hostname?.trim() || null,
        primaryIp: sanitizeIpAddress(body.primaryIp) ?? null,
        tags: normalizeTags(body.tags ?? []),
        spaceId: body.spaceId ?? null,
        createdByUserId: user.id,
        autoDetectSystem,
        osName: autoDetectSystem ? null : (body.osName ?? null),
        osVersion: autoDetectSystem ? null : body.osVersion?.trim() || null,
        architecture: autoDetectSystem ? null : (body.architecture ?? null),
        sshKeyId: body.sshKeyId ?? null,
        sshUser: body.sshUser ?? null,
        sshPort: body.sshPort ?? null,
      },
      include: { space: true },
    });
    await this.audit.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.SERVER_CREATED,
      targetType: 'server',
      targetId: server.id,
      serverId: server.id,
      requestId,
      metadata: { name: server.name },
    });
    await this.events.record({
      serverId: server.id,
      type: EVENT_TYPES.SERVER_CREATED,
      metadata: { name: server.name },
    });
    if (server.sshKeyId) {
      await this.assignSshKeyUsage(server.sshKeyId, server.id, server.name, user.id, requestId);
    }
    return toDetail(server, this.config.env.OFFLINE_TIMEOUT_MS, null, this.minAgentVersion());
  }

  async update(
    id: string,
    body: UpdateServerRequest,
    user: AuthenticatedUser,
    requestId?: string,
  ): Promise<ServerDetail> {
    const current = await this.requireServer(id);
    if (body.spaceId) {
      await this.groups.requireGroup(body.spaceId);
    }
    if (body.sshKeyId) {
      await this.requireUsableSshKey(body.sshKeyId);
    }
    if (body.version !== undefined && body.version !== current.version) {
      throw new AppError(SERVER_ERROR_CODES.VERSION_CONFLICT, 'Server version conflict', 409);
    }
    const updated = await this.prisma.server.updateMany({
      where: { id, version: current.version, deletedAt: null },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.hostname !== undefined ? { hostname: body.hostname } : {}),
        ...(body.primaryIp !== undefined
          ? { primaryIp: sanitizeIpAddress(body.primaryIp ?? undefined) ?? null }
          : {}),
        ...(body.spaceId !== undefined ? { spaceId: body.spaceId } : {}),
        ...(body.tags !== undefined ? { tags: normalizeTags(body.tags) } : {}),
        ...(body.autoDetectSystem !== undefined ? { autoDetectSystem: body.autoDetectSystem } : {}),
        ...(body.autoDetectSystem === true
          ? { osName: null, osVersion: null, architecture: null }
          : {
              ...(body.osName !== undefined ? { osName: body.osName } : {}),
              ...(body.osVersion !== undefined ? { osVersion: body.osVersion } : {}),
              ...(body.architecture !== undefined ? { architecture: body.architecture } : {}),
              ...(body.osName !== undefined ||
              body.osVersion !== undefined ||
              body.architecture !== undefined
                ? { autoDetectSystem: false }
                : {}),
            }),
        ...(body.sshKeyId !== undefined ? { sshKeyId: body.sshKeyId } : {}),
        ...(body.sshUser !== undefined ? { sshUser: body.sshUser } : {}),
        ...(body.sshPort !== undefined ? { sshPort: body.sshPort } : {}),
        version: { increment: 1 },
      },
    });
    if (updated.count === 0) {
      throw new AppError(SERVER_ERROR_CODES.VERSION_CONFLICT, 'Server version conflict', 409);
    }
    const server = await this.requireServer(id);
    await this.audit.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.SERVER_UPDATED,
      targetType: 'server',
      targetId: id,
      serverId: id,
      requestId,
      metadata: { fields: Object.keys(body).join(',') },
    });
    await this.events.record({
      serverId: id,
      type: EVENT_TYPES.SERVER_UPDATED,
      metadata: { fields: Object.keys(body).join(',') },
    });
    if (body.sshKeyId) {
      await this.assignSshKeyUsage(body.sshKeyId, server.id, server.name, user.id, requestId);
    }
    return toDetail(server, this.config.env.OFFLINE_TIMEOUT_MS, null, this.minAgentVersion());
  }

  async createEnrollmentToken(
    id: string,
    user: AuthenticatedUser,
    requestId?: string,
    purpose: 'ENROLL' | 'ROTATE' = 'ENROLL',
  ): Promise<EnrollmentTokenResponse> {
    const server = await this.requireServer(id);
    if (purpose === 'ENROLL' && server.currentCredentialId) {
      throw new AppError(SERVER_ERROR_CODES.ALREADY_ENROLLED, 'Server is already enrolled', 409);
    }
    const { token, hash } = generateEnrollmentToken();
    const expiresAt = new Date(Date.now() + this.config.env.ENROLLMENT_TOKEN_TTL_MS);
    await this.prisma.$transaction(async (tx) => {
      await tx.enrollmentToken.updateMany({
        where: { serverId: id, usedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.enrollmentToken.create({
        data: { serverId: id, tokenHash: hash, purpose, expiresAt },
      });
    });
    await this.audit.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.ENROLLMENT_TOKEN_GENERATED,
      targetType: 'server',
      targetId: id,
      serverId: id,
      requestId,
      metadata: { purpose, expiresAt: expiresAt.toISOString() },
    });
    const gateway = this.config.env.PUBLIC_GATEWAY_URL.replace(/\/$/, '');
    return {
      serverId: id,
      expiresAt: expiresAt.toISOString(),
      token,
      installCommand: 'linuxpilot-agent install --user linuxpilot',
      enrollCommand: `linuxpilot-agent enroll --gateway ${gateway} --server-id ${id} --stdin`,
    };
  }

  async enroll(input: {
    serverId: string;
    enrollmentToken: string;
    publicKey: string;
    agentVersion: string;
    requestId?: string;
  }) {
    const tokenHash = hashEnrollmentToken(input.enrollmentToken);
    const consumed = await this.prisma.$queryRaw<Array<{ id: string; purpose: string }>>`
      UPDATE "EnrollmentToken"
      SET "usedAt" = NOW()
      WHERE "tokenHash" = ${tokenHash}
        AND "serverId" = ${input.serverId}::uuid
        AND "usedAt" IS NULL
        AND "revokedAt" IS NULL
        AND "expiresAt" > NOW()
      RETURNING "id", "purpose"
    `;

    if (consumed.length === 0) {
      await this.recordEnrollmentFailure(input.serverId, input.requestId, tokenHash);
      throw new AppError(SERVER_ERROR_CODES.ENROLLMENT_INVALID, 'Enrollment token is invalid', 401);
    }

    const server = await this.prisma.server.findFirst({
      where: { id: input.serverId, deletedAt: null },
    });
    if (!server || server.status === SERVER_STATUSES.REVOKED) {
      throw new AppError(SERVER_ERROR_CODES.REVOKED, 'Server is not accepting enrollment', 403);
    }

    const purpose = consumed[0]?.purpose;
    if (purpose === 'ENROLL' && server.currentCredentialId) {
      throw new AppError(SERVER_ERROR_CODES.ALREADY_ENROLLED, 'Server is already enrolled', 409);
    }

    const credential = await this.prisma.$transaction(async (tx) => {
      if (purpose === 'ROTATE') {
        await tx.agentCredential.updateMany({
          where: { serverId: input.serverId, status: 'ACTIVE' },
          data: { status: 'ROTATED', rotatedAt: new Date() },
        });
      }
      const created = await tx.agentCredential.create({
        data: { serverId: input.serverId, publicKey: input.publicKey, status: 'ACTIVE' },
      });
      await tx.server.update({
        where: { id: input.serverId },
        data: {
          currentCredentialId: created.id,
          agentVersion: input.agentVersion,
          agentStatus: 'DISCONNECTED',
        },
      });
      return created;
    });

    await this.audit.record({
      action: AUDIT_ACTIONS.ENROLLMENT_COMPLETED,
      targetType: 'server',
      targetId: input.serverId,
      serverId: input.serverId,
      requestId: input.requestId,
      metadata: { credentialId: credential.id, purpose: purpose ?? 'ENROLL' },
    });
    this.metrics.recordEnrollment(true);
    await this.events.record({
      serverId: input.serverId,
      type: EVENT_TYPES.AGENT_ENROLLED,
      metadata: { credentialId: credential.id },
    });

    return {
      serverId: input.serverId,
      credentialId: credential.id,
      heartbeatPath: '/api/v1/agent/heartbeat',
    };
  }

  async heartbeat(
    serverId: string,
    credentialId: string,
    body: AgentHeartbeatRequest,
    requestId?: string,
  ) {
    const started = Date.now();
    const incomplete = isIncomplete(body);
    const degraded = incomplete || this.isDegraded(body);

    const previous = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!previous || previous.deletedAt || previous.status === SERVER_STATUSES.REVOKED) {
      throw new AppError(SERVER_ERROR_CODES.REVOKED, 'Server is revoked', 403);
    }

    const computed = computeStatuses({
      deletedAt: previous.deletedAt,
      status: previous.status,
      currentCredentialId: previous.currentCredentialId ?? credentialId,
      lastSeenAt: new Date(),
      maintenanceMode: previous.maintenanceMode,
      agentVersion: body.agentVersion,
      minSupportedAgentVersion: this.minAgentVersion(),
      metricsDegraded: degraded,
      offlineTimeoutMs: this.config.env.OFFLINE_TIMEOUT_MS,
    });
    const nextStatus = persistedServerStatus(computed.serverStatus);
    const now = new Date();
    const recent = await this.prisma.serverMetric.findFirst({
      where: { serverId },
      orderBy: { timestamp: 'desc' },
    });
    const writeMetric =
      !recent ||
      now.getTime() - recent.timestamp.getTime() >= this.config.env.METRICS_MIN_INTERVAL_MS;

    await this.prisma.$transaction([
      ...(writeMetric
        ? [
            this.prisma.serverMetric.create({
              data: {
                serverId,
                timestamp: now,
                cpuUsagePercent: body.cpuUsagePercent,
                load1: body.load1,
                load5: body.load5,
                load15: body.load15,
                memoryUsedBytes: toBigInt(body.memoryUsedBytes),
                memoryTotalBytes: toBigInt(body.memoryTotalBytes),
                swapUsedBytes: toBigInt(body.swapUsedBytes),
                swapTotalBytes: toBigInt(body.swapTotalBytes),
                uptimeSeconds: toBigInt(body.uptimeSeconds),
                processCount: body.processCount ?? null,
                disks: body.disks as unknown as Prisma.InputJsonValue,
                incomplete,
                networkRxBytes: toBigInt(body.networkRxBytes),
                networkTxBytes: toBigInt(body.networkTxBytes),
              },
            }),
          ]
        : []),
      this.prisma.server.update({
        where: { id: serverId },
        data: {
          hostname: body.hostname,
          primaryIp: sanitizeIpAddress(body.primaryIp) ?? previous.primaryIp,
          osName: normalizeOsField(body.osName),
          osVersion: normalizeOsField(body.osVersion),
          kernelVersion: body.kernelVersion,
          architecture: normalizeArchitecture(body.architecture) ?? UNKNOWN_SYSTEM_VALUE,
          cpuCores: body.cpuCores ?? previous.cpuCores,
          memoryTotalBytes: toBigInt(body.memoryTotalBytes) ?? previous.memoryTotalBytes,
          diskTotalBytes: diskTotalBytes(body.disks) ?? previous.diskTotalBytes,
          agentVersion: body.agentVersion,
          lastSeenAt: now,
          status: previous.maintenanceMode ? previous.status : nextStatus,
          agentStatus: computed.agentStatus,
        },
      }),
      this.prisma.agentCredential.update({
        where: { id: credentialId },
        data: { lastUsedAt: now },
      }),
    ]);

    const cameOnline =
      previous.status === SERVER_STATUSES.OFFLINE || previous.status === SERVER_STATUSES.PENDING;
    if (cameOnline) {
      await this.audit.record({
        action: AUDIT_ACTIONS.SERVER_ONLINE,
        targetType: 'server',
        targetId: serverId,
        serverId,
        requestId,
        metadata: { from: previous.status, to: nextStatus },
      });
      await this.events.record({
        serverId,
        type: EVENT_TYPES.SERVER_ONLINE,
        metadata: { from: previous.status, to: nextStatus },
      });
      if (previous.status === SERVER_STATUSES.PENDING) {
        await this.events.record({ serverId, type: EVENT_TYPES.AGENT_CONNECTED });
      }
    }
    if (previous.hostname && previous.hostname !== body.hostname) {
      await this.events.record({
        serverId,
        type: EVENT_TYPES.SERVER_UPDATED,
        metadata: { field: 'hostname' },
      });
    }
    if (computed.agentStatus === 'OUTDATED' && previous.agentStatus !== 'OUTDATED') {
      await this.events.record({
        serverId,
        type: EVENT_TYPES.AGENT_OUTDATED,
        metadata: { version: body.agentVersion },
      });
    }

    this.metrics.recordHeartbeatDuration(Date.now() - started);
    this.metrics.recordHeartbeat();
    return {
      accepted: true as const,
      status: previous.maintenanceMode
        ? 'MAINTENANCE'
        : nextStatus === SERVER_STATUSES.DEGRADED
          ? 'DEGRADED'
          : 'ONLINE',
    };
  }

  async revoke(id: string, user: AuthenticatedUser, requestId?: string) {
    const server = await this.prisma.server.findFirst({ where: { id } });
    if (!server) {
      throw new AppError(SERVER_ERROR_CODES.NOT_FOUND, 'Server not found', 404);
    }
    if (server.status === SERVER_STATUSES.REVOKED && !server.deletedAt) {
      return { success: true, revoked: true };
    }
    await this.revokeCredentials(id);
    await this.prisma.server.update({
      where: { id },
      data: {
        status: SERVER_STATUSES.REVOKED,
        agentStatus: 'REVOKED',
        currentCredentialId: null,
      },
    });
    await this.audit.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.SERVER_REVOKED,
      targetType: 'server',
      targetId: id,
      serverId: id,
      requestId,
    });
    await this.events.record({ serverId: id, type: EVENT_TYPES.AGENT_REVOKED });
    return { success: true, revoked: true };
  }

  async rotateCredential(id: string, user: AuthenticatedUser, requestId?: string) {
    await this.requireServer(id);
    await this.revokeCredentials(id, 'ROTATED');
    await this.prisma.server.update({
      where: { id },
      data: { currentCredentialId: null, status: SERVER_STATUSES.PENDING },
    });
    await this.audit.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.CREDENTIAL_ROTATED,
      targetType: 'server',
      targetId: id,
      serverId: id,
      requestId,
    });
    await this.events.record({ serverId: id, type: EVENT_TYPES.AGENT_ROTATED });
    return this.createEnrollmentToken(id, user, requestId, 'ROTATE');
  }

  async rotateFromAgent(serverId: string, publicKey: string, requestId?: string) {
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.agentCredential.updateMany({
        where: { serverId, status: 'ACTIVE' },
        data: { status: 'ROTATED', rotatedAt: new Date() },
      });
      const credential = await tx.agentCredential.create({
        data: { serverId, publicKey, status: 'ACTIVE' },
      });
      await tx.server.update({
        where: { id: serverId },
        data: { currentCredentialId: credential.id },
      });
      return credential;
    });
    await this.audit.record({
      action: AUDIT_ACTIONS.CREDENTIAL_ROTATED,
      targetType: 'server',
      targetId: serverId,
      serverId,
      requestId,
      metadata: { credentialId: created.id, source: 'agent' },
    });
    return { credentialId: created.id };
  }

  async remove(id: string, user: AuthenticatedUser, requestId?: string) {
    const server = await this.prisma.server.findFirst({ where: { id } });
    if (!server) {
      throw new AppError(SERVER_ERROR_CODES.NOT_FOUND, 'Server not found', 404);
    }
    if (server.deletedAt) {
      return { success: true, deleted: true };
    }
    await this.revokeCredentials(id);
    await this.prisma.server.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: SERVER_STATUSES.REVOKED,
        currentCredentialId: null,
      },
    });
    await this.audit.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.SERVER_DELETED,
      targetType: 'server',
      targetId: id,
      serverId: id,
      requestId,
    });
    await this.events.record({ serverId: id, type: EVENT_TYPES.SERVER_DELETED });
    return { success: true, deleted: true };
  }

  async metricsFor(id: string, query: MetricsQuery): Promise<ServerMetricsResponse> {
    await this.requireServer(id);
    const rows = await this.prisma.serverMetric.findMany({
      where: {
        serverId: id,
        ...(query.from || query.to
          ? {
              timestamp: {
                ...(query.from ? { gte: query.from } : {}),
                ...(query.to ? { lte: query.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { timestamp: 'asc' },
      take: query.limit,
    });
    return { items: rows.map(toMetricPoint) };
  }

  async auditFor(id: string): Promise<ServerAuditResponse> {
    await this.requireServer(id, true);
    const rows = await this.audit.listForServer(id);
    return { items: rows.map(toAuditEvent) };
  }

  async markOfflineBatch(): Promise<number> {
    const cutoff = new Date(Date.now() - this.config.env.OFFLINE_TIMEOUT_MS);
    const stale = await this.prisma.server.findMany({
      where: {
        deletedAt: null,
        status: { in: [SERVER_STATUSES.ONLINE, SERVER_STATUSES.DEGRADED] },
        agentStatus: { not: 'REVOKED' },
        OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: cutoff } }],
      },
      select: { id: true, status: true, maintenanceMode: true, agentStatus: true },
      take: 200,
    });
    if (stale.length === 0) {
      return 0;
    }
    await this.prisma.server.updateMany({
      where: {
        id: { in: stale.map((row) => row.id) },
        status: { in: [SERVER_STATUSES.ONLINE, SERVER_STATUSES.DEGRADED] },
      },
      data: { status: SERVER_STATUSES.OFFLINE, agentStatus: 'DISCONNECTED' },
    });
    for (const row of stale) {
      if (row.maintenanceMode) {
        continue;
      }
      await this.audit.record({
        action: AUDIT_ACTIONS.SERVER_OFFLINE,
        targetType: 'server',
        targetId: row.id,
        serverId: row.id,
        metadata: { from: row.status },
      });
      await this.events.record({
        serverId: row.id,
        type: EVENT_TYPES.SERVER_OFFLINE,
        metadata: { from: row.status },
      });
      if (row.agentStatus !== 'DISCONNECTED') {
        await this.events.record({ serverId: row.id, type: EVENT_TYPES.AGENT_DISCONNECTED });
      }
    }
    return stale.length;
  }

  async endExpiredMaintenance(): Promise<number> {
    const expired = await this.prisma.server.findMany({
      where: {
        deletedAt: null,
        maintenanceMode: true,
        maintenanceEndsAt: { lte: new Date() },
      },
      take: 200,
    });
    for (const row of expired) {
      await this.prisma.server.update({
        where: { id: row.id },
        data: {
          maintenanceMode: false,
          maintenanceReason: null,
          maintenanceStartsAt: null,
          maintenanceEndsAt: null,
          maintenanceCreatedBy: null,
        },
      });
      await this.events.record({ serverId: row.id, type: EVENT_TYPES.MAINTENANCE_ENDED });
    }
    return expired.length;
  }

  async cleanupMetricsBatch(): Promise<number> {
    const retention = new Date(
      Date.now() - this.config.env.METRICS_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const old = await this.prisma.serverMetric.findMany({
      where: { timestamp: { lt: retention } },
      select: { id: true },
      take: this.config.env.METRICS_CLEANUP_BATCH_SIZE,
    });
    if (old.length === 0) {
      return 0;
    }
    const result = await this.prisma.serverMetric.deleteMany({
      where: { id: { in: old.map((row) => row.id) } },
    });
    return result.count;
  }

  async refreshStatusCounts(): Promise<void> {
    const groups = await this.prisma.server.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    const counts = { online: 0, offline: 0, pending: 0, degraded: 0, revoked: 0 };
    for (const group of groups) {
      if (group.status === 'ONLINE') counts.online = group._count._all;
      if (group.status === 'OFFLINE') counts.offline = group._count._all;
      if (group.status === 'PENDING') counts.pending = group._count._all;
      if (group.status === 'DEGRADED') counts.degraded = group._count._all;
      if (group.status === 'REVOKED') counts.revoked = group._count._all;
    }
    this.metrics.setStatusCounts(counts);
  }

  async latestMetricsFor(id: string) {
    await this.requireServer(id);
    const latest = await this.prisma.serverMetric.findFirst({
      where: { serverId: id },
      orderBy: { timestamp: 'desc' },
    });
    return { item: latest ? toMetricPoint(latest) : null };
  }

  async ingestMetrics(serverId: string, body: AgentMetricsRequest) {
    const now = Date.now();
    const timestamp = body.timestamp ?? new Date();
    if (timestamp.getTime() - now > this.config.env.METRICS_MAX_FUTURE_MS) {
      this.metrics.recordRejectedMetrics();
      throw new AppError(
        SERVER_ERROR_CODES.METRICS_INVALID,
        'Metric timestamp is in the future',
        400,
      );
    }
    if (now - timestamp.getTime() > this.config.env.METRICS_MAX_AGE_MS) {
      this.metrics.recordRejectedMetrics();
      throw new AppError(SERVER_ERROR_CODES.METRICS_INVALID, 'Metric timestamp is too old', 400);
    }
    if (
      body.memoryUsedBytes !== null &&
      body.memoryTotalBytes !== null &&
      body.memoryUsedBytes > body.memoryTotalBytes
    ) {
      this.metrics.recordRejectedMetrics();
      throw new AppError(SERVER_ERROR_CODES.METRICS_INVALID, 'Used memory exceeds total', 400);
    }
    await this.prisma.serverMetric.create({
      data: {
        serverId,
        timestamp,
        cpuUsagePercent: body.cpuUsagePercent,
        load1: body.load1,
        load5: body.load5,
        load15: body.load15,
        memoryUsedBytes: toBigInt(body.memoryUsedBytes),
        memoryTotalBytes: toBigInt(body.memoryTotalBytes),
        swapUsedBytes: toBigInt(body.swapUsedBytes),
        swapTotalBytes: toBigInt(body.swapTotalBytes),
        uptimeSeconds: toBigInt(body.uptimeSeconds),
        processCount: body.processCount,
        disks: body.disks as unknown as Prisma.InputJsonValue,
        incomplete: body.cpuUsagePercent === null || body.memoryUsedBytes === null,
        networkRxBytes: toBigInt(body.networkRxBytes),
        networkTxBytes: toBigInt(body.networkTxBytes),
      },
    });
    this.metrics.recordAcceptedMetrics();
    return { accepted: true as const };
  }

  async healthFor(id: string): Promise<ServerHealth> {
    const server = await this.requireServer(id);
    const latest = await this.prisma.serverMetric.findFirst({
      where: { serverId: id },
      orderBy: { timestamp: 'desc' },
    });
    const computed = computeStatuses({
      deletedAt: server.deletedAt,
      status: server.status,
      currentCredentialId: server.currentCredentialId,
      lastSeenAt: server.lastSeenAt,
      maintenanceMode: server.maintenanceMode,
      agentVersion: server.agentVersion,
      minSupportedAgentVersion: this.minAgentVersion(),
      offlineTimeoutMs: this.config.env.OFFLINE_TIMEOUT_MS,
    });
    const memoryPercent =
      latest?.memoryUsedBytes && latest.memoryTotalBytes
        ? (Number(latest.memoryUsedBytes) / Number(latest.memoryTotalBytes)) * 100
        : null;
    const previous = server.lastHealthReasons
      ? {
          status: (server.lastHealthStatus as ServerHealth['status']) ?? 'OK',
          reasons: (server.lastHealthReasons as ServerHealth['reasons']) ?? [],
        }
      : null;
    const health = computeHealth({
      serverStatus: computed.serverStatus,
      agentStatus: computed.agentStatus,
      maintenanceMode: server.maintenanceMode,
      cpuPercent: latest ? toNumber(latest.cpuUsagePercent) : null,
      memoryPercent,
      diskPercent: latest ? diskUsedPercent(parseDisks(latest.disks)) : null,
      metricsTimestamp: latest?.timestamp ?? null,
      previous,
      thresholds: {
        cpuPercent: this.config.env.DEGRADED_CPU_PERCENT,
        memoryPercent: this.config.env.DEGRADED_MEMORY_PERCENT,
        diskPercent: this.config.env.DEGRADED_DISK_PERCENT,
        hysteresisPercent: this.config.env.HEALTH_HYSTERESIS_PERCENT,
      },
    });
    const prevCodes = previous ? healthReasonCodes(previous).join(',') : '';
    const nextCodes = healthReasonCodes(health).join(',');
    if (prevCodes !== nextCodes) {
      await this.prisma.server.update({
        where: { id },
        data: {
          lastHealthStatus: health.status,
          lastHealthReasons: health.reasons as unknown as Prisma.InputJsonValue,
          healthUpdatedAt: new Date(),
        },
      });
      if (health.reasons.length > 0 && (previous?.reasons.length ?? 0) === 0) {
        await this.events.record({
          serverId: id,
          type: EVENT_TYPES.HEALTH_WARNING_STARTED,
          metadata: { reasons: nextCodes },
        });
      }
      if (health.reasons.length === 0 && (previous?.reasons.length ?? 0) > 0) {
        await this.events.record({ serverId: id, type: EVENT_TYPES.HEALTH_WARNING_RESOLVED });
      }
    }
    return health;
  }

  async agentInfo(id: string): Promise<AgentInfo> {
    const server = await this.requireServer(id);
    const credential = server.currentCredentialId
      ? await this.prisma.agentCredential.findUnique({ where: { id: server.currentCredentialId } })
      : await this.prisma.agentCredential.findFirst({
          where: { serverId: id },
          orderBy: { createdAt: 'desc' },
        });
    const computed = computeStatuses({
      deletedAt: server.deletedAt,
      status: server.status,
      currentCredentialId: server.currentCredentialId,
      lastSeenAt: server.lastSeenAt,
      maintenanceMode: server.maintenanceMode,
      agentVersion: server.agentVersion,
      minSupportedAgentVersion: this.minAgentVersion(),
      offlineTimeoutMs: this.config.env.OFFLINE_TIMEOUT_MS,
    });
    return {
      id: credential?.id ?? null,
      serverId: id,
      status: computed.agentStatus,
      version: server.agentVersion,
      connectedAt: credential?.createdAt.toISOString() ?? null,
      lastSeenAt: server.lastSeenAt?.toISOString() ?? null,
      revokedAt: credential?.revokedAt?.toISOString() ?? null,
      rotatedAt: credential?.rotatedAt?.toISOString() ?? null,
    };
  }

  async listTags() {
    const rows = await this.prisma.server.findMany({
      where: { deletedAt: null },
      select: { tags: true },
    });
    return { items: normalizeTags(rows.flatMap((row) => row.tags)) };
  }

  async addTags(id: string, body: AddTagsRequest, user: AuthenticatedUser, requestId?: string) {
    const server = await this.requireServer(id);
    const tags = mergeTags(server.tags, body.tags);
    await this.prisma.server.update({ where: { id }, data: { tags, version: { increment: 1 } } });
    await this.audit.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.TAGS_UPDATED,
      targetType: 'server',
      targetId: id,
      serverId: id,
      requestId,
      metadata: { tags: tags.join(',') },
    });
    return this.getById(id);
  }

  async removeTag(id: string, tag: string, user: AuthenticatedUser, requestId?: string) {
    const server = await this.requireServer(id);
    const tags = removeTags(server.tags, [tag]);
    await this.prisma.server.update({ where: { id }, data: { tags, version: { increment: 1 } } });
    await this.audit.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.TAGS_UPDATED,
      targetType: 'server',
      targetId: id,
      serverId: id,
      requestId,
      metadata: { removed: normalizeTag(tag) },
    });
    return this.getById(id);
  }

  async assignGroup(
    id: string,
    body: AssignGroupRequest,
    user: AuthenticatedUser,
    requestId?: string,
  ) {
    if (body.spaceId) {
      await this.groups.requireGroup(body.spaceId);
    }
    const current = await this.requireServer(id);
    const previousSpaceId = current.spaceId ?? null;
    await this.prisma.server.update({
      where: { id },
      data: { spaceId: body.spaceId, version: { increment: 1 } },
    });
    const action =
      body.spaceId === null
        ? AUDIT_ACTIONS.SPACE_REMOVED
        : previousSpaceId && previousSpaceId !== body.spaceId
          ? AUDIT_ACTIONS.SPACE_CHANGED
          : AUDIT_ACTIONS.SPACE_ASSIGNED;
    await this.audit.record({
      actorId: user.id,
      action,
      targetType: 'server',
      targetId: id,
      serverId: id,
      requestId,
      metadata: { spaceId: body.spaceId ?? 'none', previousSpaceId },
    });
    return this.getById(id);
  }

  async startMaintenance(
    id: string,
    body: MaintenanceRequest,
    user: AuthenticatedUser,
    requestId?: string,
  ) {
    await this.requireServer(id);
    await this.prisma.server.update({
      where: { id },
      data: {
        maintenanceMode: true,
        maintenanceReason: body.reason,
        maintenanceStartsAt: body.startsAt ?? new Date(),
        maintenanceEndsAt: body.endsAt ?? null,
        maintenanceCreatedBy: user.id,
        version: { increment: 1 },
      },
    });
    await this.audit.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.MAINTENANCE_STARTED,
      targetType: 'server',
      targetId: id,
      serverId: id,
      requestId,
      metadata: { reason: body.reason },
    });
    await this.events.record({
      serverId: id,
      type: EVENT_TYPES.MAINTENANCE_STARTED,
      metadata: { reason: body.reason },
    });
    return this.maintenanceFor(id);
  }

  async endMaintenance(id: string, user: AuthenticatedUser, requestId?: string) {
    await this.requireServer(id);
    await this.prisma.server.update({
      where: { id },
      data: {
        maintenanceMode: false,
        maintenanceReason: null,
        maintenanceStartsAt: null,
        maintenanceEndsAt: null,
        maintenanceCreatedBy: null,
        version: { increment: 1 },
      },
    });
    await this.audit.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.MAINTENANCE_ENDED,
      targetType: 'server',
      targetId: id,
      serverId: id,
      requestId,
    });
    await this.events.record({ serverId: id, type: EVENT_TYPES.MAINTENANCE_ENDED });
    return this.maintenanceFor(id);
  }

  async maintenanceFor(id: string): Promise<MaintenanceInfo> {
    const server = await this.requireServer(id);
    return {
      active: server.maintenanceMode,
      reason: server.maintenanceReason,
      startsAt: server.maintenanceStartsAt?.toISOString() ?? null,
      endsAt: server.maintenanceEndsAt?.toISOString() ?? null,
      createdBy: server.maintenanceCreatedBy,
    };
  }

  async bulkGroup(body: BulkGroupRequest, user: AuthenticatedUser, requestId?: string) {
    if (body.spaceId) {
      await this.groups.requireGroup(body.spaceId);
    }
    const results: Array<{ serverId: string; success: boolean; errorCode?: string }> = [];
    await this.prisma.$transaction(async (tx) => {
      for (const serverId of body.serverIds) {
        const server = await tx.server.findFirst({ where: { id: serverId, deletedAt: null } });
        if (!server) {
          results.push({ serverId, success: false, errorCode: SERVER_ERROR_CODES.NOT_FOUND });
          continue;
        }
        await tx.server.update({
          where: { id: serverId },
          data: { spaceId: body.spaceId, version: { increment: 1 } },
        });
        results.push({ serverId, success: true });
      }
    });
    await this.audit.record({
      actorId: user.id,
      action: AUDIT_ACTIONS.BULK_ACTION,
      targetType: 'server',
      requestId,
      metadata: { action: 'space', count: body.serverIds.length },
    });
    return { results };
  }

  async bulkTags(body: BulkTagsRequest, user: AuthenticatedUser, requestId?: string) {
    const results = [];
    for (const serverId of body.serverIds) {
      try {
        if (body.mode === 'remove') {
          await this.removeTag(serverId, body.tags[0] ?? '', user, requestId);
        } else {
          await this.addTags(serverId, { tags: body.tags }, user, requestId);
        }
        results.push({ serverId, success: true });
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

  async bulkMaintenance(body: BulkMaintenanceRequest, user: AuthenticatedUser, requestId?: string) {
    const results = [];
    for (const serverId of body.serverIds) {
      try {
        await this.startMaintenance(
          serverId,
          { reason: body.reason, startsAt: body.startsAt, endsAt: body.endsAt },
          user,
          requestId,
        );
        results.push({ serverId, success: true });
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

  async listAudit(query: {
    page: number;
    pageSize: number;
    serverId?: string;
    actorId?: string;
    action?: string;
    result?: string;
    from?: Date;
    to?: Date;
  }): Promise<ServerAuditResponse> {
    const result = await this.audit.list(query);
    return {
      items: result.items.map(toAuditEvent),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    };
  }

  private async requireUsableSshKey(id: string) {
    const key = await this.prisma.sshKey.findFirst({
      where: { id, deletedAt: null },
    });
    if (!key) {
      throw new AppError(SERVER_ERROR_CODES.SSH_KEY_NOT_FOUND, 'SSH key not found', 404);
    }
    if (
      key.status === 'DISABLED' ||
      key.status === 'COMPROMISED' ||
      key.status === 'EXPIRED' ||
      key.status === 'DELETING'
    ) {
      throw new AppError(SERVER_ERROR_CODES.SSH_KEY_DISABLED, 'SSH key cannot be used', 409);
    }
    return key;
  }

  private async assignSshKeyUsage(
    sshKeyId: string,
    serverId: string,
    label: string,
    actorId?: string,
    requestId?: string,
  ) {
    await this.prisma.sshKeyUsage.upsert({
      where: {
        sshKeyId_kind_targetId: {
          sshKeyId,
          kind: 'SERVER',
          targetId: serverId,
        },
      },
      create: { sshKeyId, kind: 'SERVER', targetId: serverId, label },
      update: { label },
    });
    await this.prisma.sshKey.update({
      where: { id: sshKeyId },
      data: { lastUsedAt: new Date(), status: 'ACTIVE' },
    });
    await this.audit.record({
      actorId,
      action: AUDIT_ACTIONS.SSH_KEY_ASSIGNED,
      targetType: 'ssh_key',
      targetId: sshKeyId,
      serverId,
      requestId,
      metadata: { serverId },
    });
  }

  private async requireServer(id: string, includeDeleted = false, withGroup = false) {
    const server = await this.prisma.server.findFirst({
      where: { id, ...(includeDeleted ? {} : { deletedAt: null }) },
      include: withGroup ? { space: true } : undefined,
    });
    if (!server) {
      throw new AppError(SERVER_ERROR_CODES.NOT_FOUND, 'Server not found', 404);
    }
    return server;
  }

  private statusFilter(status?: ServerStatus): Prisma.ServerWhereInput {
    if (!status) {
      return {};
    }
    if (status === SERVER_STATUSES.MAINTENANCE) {
      return { maintenanceMode: true };
    }
    return { status, maintenanceMode: false };
  }

  private minAgentVersion(): string | undefined {
    return this.config.env.AGENT_MIN_SUPPORTED_VERSION || undefined;
  }

  private async latestMetrics(serverIds: string[]) {
    const map = new Map<string, Awaited<ReturnType<PrismaService['serverMetric']['findFirst']>>>();
    if (serverIds.length === 0) {
      return map;
    }
    const rows = await this.prisma.$queryRaw<Array<{ serverId: string }>>`
      SELECT DISTINCT ON ("serverId") "serverId"
      FROM "ServerMetric"
      WHERE "serverId" = ANY(${serverIds}::uuid[])
      ORDER BY "serverId", "timestamp" DESC
    `;
    const latest = await this.prisma.serverMetric.findMany({
      where: {
        serverId: { in: rows.map((row) => row.serverId) },
      },
      orderBy: { timestamp: 'desc' },
    });
    for (const row of latest) {
      if (!map.has(row.serverId)) {
        map.set(row.serverId, row);
      }
    }
    return map;
  }

  private async revokeCredentials(serverId: string, status: 'REVOKED' | 'ROTATED' = 'REVOKED') {
    await this.prisma.$transaction([
      this.prisma.agentCredential.updateMany({
        where: { serverId, status: 'ACTIVE' },
        data: {
          status,
          revokedAt: status === 'REVOKED' ? new Date() : undefined,
          rotatedAt: status === 'ROTATED' ? new Date() : undefined,
        },
      }),
      this.prisma.enrollmentToken.updateMany({
        where: { serverId, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);
    if (status === 'REVOKED') {
      await this.audit.record({
        action: AUDIT_ACTIONS.CREDENTIAL_REVOKED,
        targetType: 'server',
        targetId: serverId,
        serverId,
      });
    }
  }

  private async recordEnrollmentFailure(
    serverId: string,
    requestId: string | undefined,
    tokenHash: string,
  ) {
    const existing = await this.prisma.enrollmentToken.findUnique({ where: { tokenHash } });
    const reason = !existing
      ? 'unknown'
      : existing.serverId !== serverId
        ? 'server_mismatch'
        : existing.usedAt
          ? 'already_used'
          : existing.expiresAt.getTime() <= Date.now()
            ? 'expired'
            : 'invalid';
    this.metrics.recordRejectedAgentRequest();
    this.metrics.recordEnrollment(false);
    await this.audit.record({
      action: AUDIT_ACTIONS.ENROLLMENT_FAILED,
      targetType: 'server',
      targetId: serverId,
      serverId,
      requestId,
      metadata: { reason },
    });
    if (reason === 'expired') {
      throw new AppError(
        SERVER_ERROR_CODES.ENROLLMENT_EXPIRED,
        'Enrollment token has expired',
        401,
      );
    }
    if (reason === 'already_used') {
      throw new AppError(SERVER_ERROR_CODES.ENROLLMENT_USED, 'Enrollment token already used', 401);
    }
  }

  private isDegraded(body: AgentHeartbeatRequest): boolean {
    const cpu = body.cpuUsagePercent ?? 0;
    const memory =
      body.memoryUsedBytes !== null && body.memoryTotalBytes
        ? (body.memoryUsedBytes / body.memoryTotalBytes) * 100
        : 0;
    const disk = Math.max(
      0,
      ...body.disks.filter((item) => !item.excluded).map((item) => item.usedPercent),
    );
    return (
      cpu >= this.config.env.DEGRADED_CPU_PERCENT ||
      memory >= this.config.env.DEGRADED_MEMORY_PERCENT ||
      disk >= this.config.env.DEGRADED_DISK_PERCENT
    );
  }
}

function isIncomplete(body: AgentHeartbeatRequest): boolean {
  return (
    body.cpuUsagePercent === null ||
    body.memoryUsedBytes === null ||
    body.memoryTotalBytes === null ||
    body.uptimeSeconds === null
  );
}

function toBigInt(value: number | null | undefined): bigint | null {
  if (value === null || value === undefined) {
    return null;
  }
  return BigInt(Math.trunc(value));
}

export function diskUsedPercent(disks: DiskMetric[]): number {
  return Math.max(0, ...disks.filter((item) => !item.excluded).map((item) => item.usedPercent));
}

function diskTotalBytes(disks: DiskMetric[]): bigint | null {
  const total = disks
    .filter((item) => !item.excluded)
    .reduce((sum, disk) => sum + disk.totalBytes, 0);
  return total > 0 ? BigInt(Math.trunc(total)) : null;
}
