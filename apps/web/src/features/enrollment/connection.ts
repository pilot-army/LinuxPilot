import { AGENT_STATUSES, SERVER_STATUSES, type ServerDetail } from '@linuxpilot/server-contracts';
import type { ConnectionOutcome, EnrollmentSecret, TimelineItem, TimelineState } from './types';

export function tokenIsExpired(expiresAt: string | null, now = Date.now()): boolean {
  if (!expiresAt) {
    return true;
  }
  const expires = Date.parse(expiresAt);
  return Number.isNaN(expires) || expires <= now;
}

export function deriveConnection(input: {
  server: ServerDetail | null;
  secret: EnrollmentSecret | null;
  timedOut: boolean;
  pollError: boolean;
}): { items: TimelineItem[]; outcome: ConnectionOutcome } {
  const { server, secret, timedOut, pollError } = input;
  const expired = tokenIsExpired(secret?.expiresAt ?? null);
  const revoked =
    server?.status === SERVER_STATUSES.REVOKED || server?.agentStatus === AGENT_STATUSES.REVOKED;
  const connected =
    server?.status === SERVER_STATUSES.ONLINE ||
    server?.status === SERVER_STATUSES.DEGRADED ||
    server?.agentStatus === AGENT_STATUSES.CONNECTED;
  const heartbeat = Boolean(server?.lastSeenAt);
  const metrics = Boolean(
    server?.latestMetric ||
      typeof server?.cpuUsagePercent === 'number' ||
      typeof server?.memoryUsedBytes === 'number',
  );

  function state(done: boolean, waiting: boolean): TimelineState {
    if (revoked) {
      return done ? 'done' : 'revoked';
    }
    if (pollError && !done) {
      return 'error';
    }
    if (timedOut && !done) {
      return 'timeout';
    }
    if (done) {
      return 'done';
    }
    if (expired && waiting) {
      return 'expired';
    }
    return 'waiting';
  }

  const items: TimelineItem[] = [
    { id: 'created', state: server ? 'done' : 'waiting' },
    {
      id: 'token',
      state: secret && !expired ? 'done' : expired && secret ? 'expired' : state(false, true),
    },
    { id: 'waiting', state: state(Boolean(server) && !connected, !connected) },
    { id: 'connected', state: state(connected, !connected) },
    { id: 'heartbeat', state: state(heartbeat, connected && !heartbeat) },
    { id: 'metrics', state: state(metrics, heartbeat && !metrics) },
  ];

  if (items[1] && secret && !expired) {
    items[1].state = 'done';
  }

  let outcome: ConnectionOutcome = 'waiting';
  if (revoked) {
    outcome = 'revoked';
  } else if (pollError) {
    outcome = 'error';
  } else if (expired && !connected) {
    outcome = 'expired';
  } else if (timedOut && !connected) {
    outcome = 'timeout';
  } else if (metrics) {
    outcome = 'metrics';
  } else if (connected) {
    outcome = 'connected';
  }

  return { items, outcome };
}
