import { describe, expect, it } from 'vitest';
import type { ServerDetail } from '@linuxpilot/server-contracts';
import { deriveConnection, tokenIsExpired } from './connection';

function server(overrides: Partial<ServerDetail> = {}): ServerDetail {
  return {
    id: 'srv-1',
    name: 'edge-01',
    hostname: 'edge-01',
    primaryIp: null,
    description: '',
    status: 'PENDING',
    agentStatus: 'NOT_INSTALLED',
    osName: null,
    osVersion: null,
    kernelVersion: null,
    architecture: null,
    cpuCores: null,
    agentVersion: null,
    lastSeenAt: null,
    createdAt: '2026-08-16T08:00:00.000Z',
    updatedAt: '2026-08-16T08:00:00.000Z',
    tags: [],
    groupId: null,
    groupName: null,
    spaceId: null,
    spaceName: null,
    maintenanceMode: false,
    version: 1,
    credentialId: null,
    cpuUsagePercent: null,
    memoryUsedBytes: null,
    memoryTotalBytes: null,
    diskUsedBytes: null,
    diskTotalBytes: null,
    uptimeSeconds: null,
    latestMetric: null,
    ...overrides,
  };
}

const secret = {
  token: 'secret',
  enrollCommand: 'enroll',
  installCommand: 'install',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
};

describe('enrollment connection', () => {
  it('treats a missing or past expiry as expired', () => {
    expect(tokenIsExpired(null)).toBe(true);
    expect(tokenIsExpired(new Date(Date.now() - 1000).toISOString())).toBe(true);
    expect(tokenIsExpired(secret.expiresAt)).toBe(false);
  });

  it('does not treat missing metric fields as received metrics', () => {
    expect(
      deriveConnection({
        server: server({ status: 'PENDING', cpuUsagePercent: null, memoryUsedBytes: null }),
        secret,
        timedOut: false,
        pollError: false,
      }).outcome,
    ).toBe('waiting');
  });

  it('derives waiting, connected, metrics, timeout, and revoked outcomes', () => {
    expect(
      deriveConnection({ server: server(), secret, timedOut: false, pollError: false }).outcome,
    ).toBe('waiting');
    expect(
      deriveConnection({
        server: server({ status: 'ONLINE', agentStatus: 'CONNECTED' }),
        secret,
        timedOut: false,
        pollError: false,
      }).outcome,
    ).toBe('connected');
    expect(
      deriveConnection({
        server: server({
          status: 'ONLINE',
          lastSeenAt: '2026-08-16T09:00:00.000Z',
          latestMetric: {
            timestamp: '2026-08-16T09:00:00.000Z',
            cpuUsagePercent: 10,
            load1: 0.1,
            load5: 0.1,
            load15: 0.1,
            memoryUsedBytes: 1,
            memoryTotalBytes: 2,
            swapUsedBytes: null,
            swapTotalBytes: null,
            uptimeSeconds: 10,
            processCount: 1,
            disks: [],
            incomplete: false,
            networkRxBytes: null,
            networkTxBytes: null,
          },
        }),
        secret,
        timedOut: false,
        pollError: false,
      }).outcome,
    ).toBe('metrics');
    expect(
      deriveConnection({
        server: server(),
        secret,
        timedOut: true,
        pollError: false,
      }).outcome,
    ).toBe('timeout');
    expect(
      deriveConnection({
        server: server({ status: 'REVOKED', agentStatus: 'REVOKED' }),
        secret,
        timedOut: false,
        pollError: false,
      }).outcome,
    ).toBe('revoked');
  });
});
