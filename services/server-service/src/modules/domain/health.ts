import {
  AGENT_STATUSES,
  HEALTH_REASON_CODES,
  HEALTH_STATUSES,
  SERVER_STATUSES,
  type AgentStatus,
  type HealthReason,
  type HealthStatus,
  type ServerHealth,
  type ServerStatus,
} from '@linuxpilot/server-contracts';

export type HealthThresholds = {
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  hysteresisPercent: number;
  metricsStaleMs: number;
};

export const DEFAULT_HEALTH_THRESHOLDS: HealthThresholds = {
  cpuPercent: 90,
  memoryPercent: 90,
  diskPercent: 90,
  hysteresisPercent: 5,
  metricsStaleMs: 180_000,
};

export type HealthInput = {
  serverStatus: ServerStatus;
  agentStatus: AgentStatus;
  maintenanceMode?: boolean;
  cpuPercent?: number | null;
  memoryPercent?: number | null;
  diskPercent?: number | null;
  metricsTimestamp?: Date | null;
  previous?: ServerHealth | null;
  now?: number;
  thresholds?: Partial<HealthThresholds>;
};

function crossed(
  value: number | null | undefined,
  threshold: number,
  hysteresis: number,
  previousActive: boolean,
): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (previousActive) {
    return value >= threshold - hysteresis;
  }
  return value >= threshold;
}

export function computeHealth(input: HealthInput): ServerHealth {
  const thresholds = { ...DEFAULT_HEALTH_THRESHOLDS, ...input.thresholds };
  const now = input.now ?? Date.now();
  const previousCodes = new Set(input.previous?.reasons.map((reason) => reason.code) ?? []);
  const reasons: HealthReason[] = [];

  if (input.agentStatus === AGENT_STATUSES.NOT_INSTALLED) {
    reasons.push({ code: HEALTH_REASON_CODES.AGENT_NOT_INSTALLED, severity: 'WARNING' });
  } else if (input.agentStatus === AGENT_STATUSES.DISCONNECTED && !input.maintenanceMode) {
    reasons.push({ code: HEALTH_REASON_CODES.AGENT_DISCONNECTED, severity: 'CRITICAL' });
  } else if (input.agentStatus === AGENT_STATUSES.OUTDATED) {
    reasons.push({ code: HEALTH_REASON_CODES.AGENT_OUTDATED, severity: 'WARNING' });
  }

  if (input.serverStatus === SERVER_STATUSES.OFFLINE && !input.maintenanceMode) {
    reasons.push({ code: HEALTH_REASON_CODES.SERVER_OFFLINE, severity: 'CRITICAL' });
  }

  if (
    input.metricsTimestamp &&
    now - input.metricsTimestamp.getTime() > thresholds.metricsStaleMs &&
    input.agentStatus !== AGENT_STATUSES.NOT_INSTALLED
  ) {
    reasons.push({
      code: HEALTH_REASON_CODES.METRICS_STALE,
      severity: 'WARNING',
      since: input.metricsTimestamp.toISOString(),
    });
  }

  if (
    crossed(
      input.cpuPercent,
      thresholds.cpuPercent,
      thresholds.hysteresisPercent,
      previousCodes.has(HEALTH_REASON_CODES.CPU_HIGH),
    )
  ) {
    reasons.push({
      code: HEALTH_REASON_CODES.CPU_HIGH,
      severity: 'WARNING',
      value: input.cpuPercent ?? undefined,
      threshold: thresholds.cpuPercent,
    });
  }

  if (
    crossed(
      input.memoryPercent,
      thresholds.memoryPercent,
      thresholds.hysteresisPercent,
      previousCodes.has(HEALTH_REASON_CODES.MEMORY_HIGH),
    )
  ) {
    reasons.push({
      code: HEALTH_REASON_CODES.MEMORY_HIGH,
      severity: 'WARNING',
      value: input.memoryPercent ?? undefined,
      threshold: thresholds.memoryPercent,
    });
  }

  if (
    crossed(
      input.diskPercent,
      thresholds.diskPercent,
      thresholds.hysteresisPercent,
      previousCodes.has(HEALTH_REASON_CODES.DISK_HIGH),
    )
  ) {
    reasons.push({
      code: HEALTH_REASON_CODES.DISK_HIGH,
      severity: 'WARNING',
      value: input.diskPercent ?? undefined,
      threshold: thresholds.diskPercent,
    });
  }

  const status: HealthStatus = reasons.some((reason) => reason.severity === 'CRITICAL')
    ? HEALTH_STATUSES.CRITICAL
    : reasons.length > 0
      ? HEALTH_STATUSES.WARNING
      : HEALTH_STATUSES.OK;

  return { status, reasons };
}

export function healthReasonCodes(health: ServerHealth): string[] {
  return health.reasons.map((reason) => reason.code).sort();
}
