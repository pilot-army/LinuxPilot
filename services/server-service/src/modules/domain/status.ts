import {
  AGENT_STATUSES,
  SERVER_STATUSES,
  type AgentStatus,
  type ServerStatus,
} from '@linuxpilot/server-contracts';

export type StatusInput = {
  deletedAt?: Date | null;
  status: ServerStatus;
  agentStatus?: AgentStatus | null;
  currentCredentialId?: string | null;
  lastSeenAt?: Date | null;
  maintenanceMode?: boolean;
  agentVersion?: string | null;
  minSupportedAgentVersion?: string | null;
  metricsDegraded?: boolean;
  now?: number;
  offlineTimeoutMs: number;
};

export type ComputedStatuses = {
  serverStatus: ServerStatus;
  agentStatus: AgentStatus;
};

export function compareVersions(left: string, right: string): number {
  const a = left.split('.').map((part) => Number.parseInt(part.replace(/\D/g, ''), 10) || 0);
  const b = right.split('.').map((part) => Number.parseInt(part.replace(/\D/g, ''), 10) || 0);
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0);
    if (delta !== 0) {
      return delta;
    }
  }
  return 0;
}

export function isAgentOutdated(
  agentVersion: string | null | undefined,
  minSupported: string | null | undefined,
): boolean {
  if (!agentVersion || !minSupported) {
    return false;
  }
  return compareVersions(agentVersion, minSupported) < 0;
}

export function computeStatuses(input: StatusInput): ComputedStatuses {
  const now = input.now ?? Date.now();
  if (input.deletedAt || input.status === SERVER_STATUSES.REVOKED) {
    return { serverStatus: SERVER_STATUSES.REVOKED, agentStatus: AGENT_STATUSES.REVOKED };
  }

  const hasCredential = Boolean(input.currentCredentialId);
  if (!hasCredential) {
    return {
      serverStatus: SERVER_STATUSES.PENDING,
      agentStatus: AGENT_STATUSES.NOT_INSTALLED,
    };
  }

  const stale = !input.lastSeenAt || now - input.lastSeenAt.getTime() > input.offlineTimeoutMs;
  const outdated = isAgentOutdated(input.agentVersion, input.minSupportedAgentVersion);

  if (input.maintenanceMode) {
    return {
      serverStatus: SERVER_STATUSES.MAINTENANCE,
      agentStatus: stale
        ? AGENT_STATUSES.DISCONNECTED
        : outdated
          ? AGENT_STATUSES.OUTDATED
          : AGENT_STATUSES.CONNECTED,
    };
  }

  if (stale) {
    return { serverStatus: SERVER_STATUSES.OFFLINE, agentStatus: AGENT_STATUSES.DISCONNECTED };
  }

  if (outdated) {
    return { serverStatus: SERVER_STATUSES.DEGRADED, agentStatus: AGENT_STATUSES.OUTDATED };
  }

  if (input.metricsDegraded) {
    return { serverStatus: SERVER_STATUSES.DEGRADED, agentStatus: AGENT_STATUSES.CONNECTED };
  }

  return { serverStatus: SERVER_STATUSES.ONLINE, agentStatus: AGENT_STATUSES.CONNECTED };
}

export function persistedServerStatus(
  computed: ServerStatus,
): Exclude<ServerStatus, 'MAINTENANCE'> {
  if (computed === SERVER_STATUSES.MAINTENANCE) {
    return SERVER_STATUSES.ONLINE;
  }
  return computed;
}
