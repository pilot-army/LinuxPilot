import {
  AGENT_STATUSES,
  SERVER_STATUSES,
  type ServerStatus,
  type ServerSummary,
} from '@linuxpilot/server-contracts';
import type { ServerCounts } from './types';

export const HIGH_LOAD_THRESHOLD = 80;
export const CRITICAL_LOAD_THRESHOLD = 90;

export function hasInstalledAgent(
  server: Pick<ServerSummary, 'agentVersion' | 'lastSeenAt'>,
): boolean {
  return server.agentVersion !== null || server.lastSeenAt !== null;
}

export function ratioToPercent(used: number | null, total: number | null): number | null {
  if (used === null || total === null || total <= 0) {
    return null;
  }
  return Math.min(100, Math.max(0, (used / total) * 100));
}

export function metricTone(value: number | null): 'ok' | 'warning' | 'critical' | 'empty' {
  if (value === null) {
    return 'empty';
  }
  if (value >= CRITICAL_LOAD_THRESHOLD) {
    return 'critical';
  }
  if (value >= HIGH_LOAD_THRESHOLD) {
    return 'warning';
  }
  return 'ok';
}

export function averageCpuPercent(items: ServerSummary[]): number | null {
  const values = items
    .map((server) => server.cpuUsagePercent)
    .filter((value): value is number => value !== null);
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function outdatedAgentCount(items: ServerSummary[]): number {
  return items.filter((server) => server.agentStatus === AGENT_STATUSES.OUTDATED).length;
}

export function availabilityPercent(counts: ServerCounts): number | null {
  if (counts.all <= 0) {
    return null;
  }
  return (counts.online / counts.all) * 100;
}

export function matchesClientFilters(
  server: ServerSummary,
  query: {
    q: string;
    os: string;
    agent?: 'all' | 'installed' | 'missing';
    spaceId?: string;
  },
): boolean {
  if (query.os && (server.osName ?? '') !== query.os) {
    return false;
  }
  if (query.spaceId && (server.spaceId ?? server.groupId) !== query.spaceId) {
    return false;
  }
  if (query.agent === 'installed' && !hasInstalledAgent(server)) {
    return false;
  }
  if (query.agent === 'missing' && hasInstalledAgent(server)) {
    return false;
  }
  const needle = query.q.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const haystack = [server.name, server.hostname, server.id, server.primaryIp, ...server.tags]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

export function uniqueOsNames(servers: ServerSummary[]): string[] {
  return [
    ...new Set(
      servers.map((server) => server.osName).filter((value): value is string => Boolean(value)),
    ),
  ].sort();
}

export function isSelectableStatus(status: ServerStatus): boolean {
  return status !== SERVER_STATUSES.REVOKED;
}
