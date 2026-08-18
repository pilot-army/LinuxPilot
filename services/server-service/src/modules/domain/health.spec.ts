import {
  AGENT_STATUSES,
  HEALTH_REASON_CODES,
  HEALTH_STATUSES,
  SERVER_STATUSES,
} from '@linuxpilot/server-contracts';
import { computeHealth } from './health';

describe('computeHealth', () => {
  it('reports not installed without inventing metrics', () => {
    const health = computeHealth({
      serverStatus: SERVER_STATUSES.PENDING,
      agentStatus: AGENT_STATUSES.NOT_INSTALLED,
    });
    expect(health.status).toBe(HEALTH_STATUSES.WARNING);
    expect(health.reasons.map((reason) => reason.code)).toContain(
      HEALTH_REASON_CODES.AGENT_NOT_INSTALLED,
    );
  });

  it('uses hysteresis so a value just below the threshold stays warning', () => {
    const previous = computeHealth({
      serverStatus: SERVER_STATUSES.ONLINE,
      agentStatus: AGENT_STATUSES.CONNECTED,
      memoryPercent: 91,
      thresholds: { memoryPercent: 90, hysteresisPercent: 5 },
    });
    expect(previous.reasons.some((reason) => reason.code === HEALTH_REASON_CODES.MEMORY_HIGH)).toBe(
      true,
    );

    const held = computeHealth({
      serverStatus: SERVER_STATUSES.ONLINE,
      agentStatus: AGENT_STATUSES.CONNECTED,
      memoryPercent: 86,
      previous,
      thresholds: { memoryPercent: 90, hysteresisPercent: 5 },
    });
    expect(held.reasons.some((reason) => reason.code === HEALTH_REASON_CODES.MEMORY_HIGH)).toBe(
      true,
    );

    const cleared = computeHealth({
      serverStatus: SERVER_STATUSES.ONLINE,
      agentStatus: AGENT_STATUSES.CONNECTED,
      memoryPercent: 80,
      previous,
      thresholds: { memoryPercent: 90, hysteresisPercent: 5 },
    });
    expect(cleared.reasons.some((reason) => reason.code === HEALTH_REASON_CODES.MEMORY_HIGH)).toBe(
      false,
    );
  });

  it('suppresses offline alerts during maintenance', () => {
    const health = computeHealth({
      serverStatus: SERVER_STATUSES.OFFLINE,
      agentStatus: AGENT_STATUSES.DISCONNECTED,
      maintenanceMode: true,
    });
    expect(health.reasons.map((reason) => reason.code)).not.toContain(
      HEALTH_REASON_CODES.SERVER_OFFLINE,
    );
    expect(health.reasons.map((reason) => reason.code)).not.toContain(
      HEALTH_REASON_CODES.AGENT_DISCONNECTED,
    );
  });
});
