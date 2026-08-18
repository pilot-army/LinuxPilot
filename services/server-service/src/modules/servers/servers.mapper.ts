import {
  AGENT_STATUSES,
  SERVER_STATUSES,
  type AgentStatus,
  type DiskMetric,
  type ServerAuditEvent,
  type ServerDetail,
  type ServerMetricPoint,
  type ServerStatus,
  type ServerSummary,
} from '@linuxpilot/server-contracts';
import {
  type Server,
  type ServerAuditLog,
  type ServerSpace,
  type ServerMetric,
} from '../../generated/prisma-client';
import { computeStatuses } from '../domain/status';
import { resolveSystemInfoStatus } from '../domain/system-info';

export function toNumber(
  value: bigint | number | { toNumber?: () => number } | null | undefined,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  return Number(value);
}

export function effectiveStatus(
  server: Pick<
    Server,
    | 'status'
    | 'lastSeenAt'
    | 'deletedAt'
    | 'currentCredentialId'
    | 'maintenanceMode'
    | 'agentVersion'
    | 'agentStatus'
  >,
  offlineTimeoutMs: number,
  now = Date.now(),
  minSupportedAgentVersion?: string,
): ServerStatus {
  return computeStatuses({
    deletedAt: server.deletedAt,
    status: server.status,
    currentCredentialId: server.currentCredentialId,
    lastSeenAt: server.lastSeenAt,
    maintenanceMode: server.maintenanceMode,
    agentVersion: server.agentVersion,
    minSupportedAgentVersion,
    now,
    offlineTimeoutMs,
  }).serverStatus;
}

export function effectiveAgentStatus(
  server: Pick<
    Server,
    | 'status'
    | 'lastSeenAt'
    | 'deletedAt'
    | 'currentCredentialId'
    | 'maintenanceMode'
    | 'agentVersion'
    | 'agentStatus'
  >,
  offlineTimeoutMs: number,
  now = Date.now(),
  minSupportedAgentVersion?: string,
): AgentStatus {
  return computeStatuses({
    deletedAt: server.deletedAt,
    status: server.status,
    currentCredentialId: server.currentCredentialId,
    lastSeenAt: server.lastSeenAt,
    maintenanceMode: server.maintenanceMode,
    agentVersion: server.agentVersion,
    minSupportedAgentVersion,
    now,
    offlineTimeoutMs,
  }).agentStatus;
}

export function toSummary(
  server: Server & { space?: ServerSpace | null },
  offlineTimeoutMs: number,
  latest?: ServerMetric | null,
  minSupportedAgentVersion?: string,
): ServerSummary {
  const disks = latest ? parseDisks(latest.disks) : [];
  const diskUsed = disks.reduce((sum, disk) => sum + (disk.excluded ? 0 : disk.usedBytes), 0);
  const diskTotal = disks.reduce((sum, disk) => sum + (disk.excluded ? 0 : disk.totalBytes), 0);
  return {
    id: server.id,
    name: server.name,
    hostname: server.hostname,
    primaryIp: server.primaryIp,
    description: server.description,
    status: effectiveStatus(server, offlineTimeoutMs, Date.now(), minSupportedAgentVersion),
    agentStatus: effectiveAgentStatus(
      server,
      offlineTimeoutMs,
      Date.now(),
      minSupportedAgentVersion,
    ),
    osName: server.osName,
    osVersion: server.osVersion,
    kernelVersion: server.kernelVersion,
    architecture: server.architecture,
    autoDetectSystem: server.autoDetectSystem,
    systemInfoStatus: resolveSystemInfoStatus(server),
    cpuCores: server.cpuCores,
    agentVersion: server.agentVersion,
    lastSeenAt: server.lastSeenAt?.toISOString() ?? null,
    createdAt: server.createdAt.toISOString(),
    updatedAt: server.updatedAt.toISOString(),
    tags: server.tags,
    spaceId: server.spaceId,
    spaceName: server.space?.name ?? null,
    groupId: server.spaceId,
    groupName: server.space?.name ?? null,
    maintenanceMode: server.maintenanceMode,
    version: server.version,
    credentialId: server.currentCredentialId,
    sshKeyId: server.sshKeyId,
    sshUser: server.sshUser,
    sshPort: server.sshPort,
    cpuUsagePercent: latest ? toNumber(latest.cpuUsagePercent) : null,
    memoryUsedBytes: latest ? toNumber(latest.memoryUsedBytes) : null,
    memoryTotalBytes: latest
      ? toNumber(latest.memoryTotalBytes)
      : toNumber(server.memoryTotalBytes),
    diskUsedBytes: diskTotal > 0 ? diskUsed : null,
    diskTotalBytes: diskTotal > 0 ? diskTotal : toNumber(server.diskTotalBytes),
    uptimeSeconds: latest ? toNumber(latest.uptimeSeconds) : null,
  };
}

export function toDetail(
  server: Server & { space?: ServerSpace | null },
  offlineTimeoutMs: number,
  latest?: ServerMetric | null,
  minSupportedAgentVersion?: string,
): ServerDetail {
  return {
    ...toSummary(server, offlineTimeoutMs, latest, minSupportedAgentVersion),
    latestMetric: latest ? toMetricPoint(latest) : null,
  };
}

export function toMetricPoint(metric: ServerMetric): ServerMetricPoint {
  return {
    timestamp: metric.timestamp.toISOString(),
    cpuUsagePercent: toNumber(metric.cpuUsagePercent),
    load1: toNumber(metric.load1),
    load5: toNumber(metric.load5),
    load15: toNumber(metric.load15),
    memoryUsedBytes: toNumber(metric.memoryUsedBytes),
    memoryTotalBytes: toNumber(metric.memoryTotalBytes),
    swapUsedBytes: toNumber(metric.swapUsedBytes),
    swapTotalBytes: toNumber(metric.swapTotalBytes),
    uptimeSeconds: toNumber(metric.uptimeSeconds),
    processCount: metric.processCount,
    disks: parseDisks(metric.disks),
    incomplete: metric.incomplete,
    networkRxBytes: toNumber(metric.networkRxBytes),
    networkTxBytes: toNumber(metric.networkTxBytes),
  };
}

export function toAuditEvent(row: ServerAuditLog): ServerAuditEvent {
  const metadata =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, string | number | boolean>)
      : {};
  return {
    id: row.id,
    action: row.action,
    actorId: row.actorId,
    requestId: row.requestId,
    createdAt: row.createdAt.toISOString(),
    metadata,
    targetType: row.targetType,
    targetId: row.targetId,
    serverId: row.serverId,
    result: row.result,
  };
}

export function parseDisks(value: unknown): DiskMetric[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is DiskMetric => {
    return (
      typeof item === 'object' &&
      item !== null &&
      typeof (item as DiskMetric).mountPoint === 'string' &&
      typeof (item as DiskMetric).usedBytes === 'number' &&
      typeof (item as DiskMetric).totalBytes === 'number'
    );
  });
}

export { AGENT_STATUSES, SERVER_STATUSES };
