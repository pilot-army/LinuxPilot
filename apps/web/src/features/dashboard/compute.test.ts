import { describe, expect, it } from 'vitest';
import { SERVER_STATUSES, type ServerSummary } from '@linuxpilot/server-contracts';
import {
  averageCpu,
  averageDisk,
  buildAttentionIssues,
  buildAttentionItems,
  buildSystemStatus,
  computeInfrastructureDistribution,
  computeSummary,
  countDisconnectedAgents,
  countOnlineServers,
  countServerFilters,
  countServers,
  environmentKey,
  filterDashboardServers,
  hasInstalledAgent,
  isHighLoad,
  matchesServerSearch,
  osFamilyKey,
  onlinePercent,
  ratioToPercent,
  selectDashboardServers,
  toDashboardServer,
  toDashboardStatus,
  computeSetupProgress,
  resolveDashboardMode,
} from './compute';

function server(
  partial: Partial<ServerSummary> & Pick<ServerSummary, 'id' | 'name' | 'status'>,
): ServerSummary {
  return {
    hostname: partial.hostname ?? partial.name,
    description: '',
    osName: null,
    osVersion: null,
    kernelVersion: null,
    architecture: null,
    agentVersion: null,
    lastSeenAt: null,
    createdAt: '2026-08-16T09:00:00.000Z',
    updatedAt: '2026-08-16T09:00:00.000Z',
    tags: [],
    primaryIp: null,
    agentStatus: 'NOT_INSTALLED',
    groupId: null,
    groupName: null,
    spaceId: null,
    spaceName: null,
    maintenanceMode: false,
    version: 1,
    cpuCores: null,
    credentialId: null,
    cpuUsagePercent: null,
    memoryUsedBytes: null,
    memoryTotalBytes: null,
    diskUsedBytes: null,
    diskTotalBytes: null,
    uptimeSeconds: null,
    ...partial,
  };
}

const fleet: ServerSummary[] = [
  server({
    id: '1',
    name: 'prod-01',
    status: SERVER_STATUSES.ONLINE,
    agentVersion: '1.2.0',
    lastSeenAt: '2026-08-16T09:00:00.000Z',
    cpuUsagePercent: 38,
    memoryUsedBytes: 52,
    memoryTotalBytes: 100,
    diskUsedBytes: 60,
    diskTotalBytes: 100,
  }),
  server({
    id: '2',
    name: 'web-02',
    status: SERVER_STATUSES.ONLINE,
    lastSeenAt: '2026-08-16T09:00:00.000Z',
    cpuUsagePercent: 24,
    diskUsedBytes: 40,
    diskTotalBytes: 100,
  }),
  server({
    id: '3',
    name: 'database-01',
    status: SERVER_STATUSES.ONLINE,
    lastSeenAt: '2026-08-16T09:00:00.000Z',
    cpuUsagePercent: 46,
    diskUsedBytes: 80,
    diskTotalBytes: 100,
  }),
  server({
    id: '4',
    name: 'backup-01',
    status: SERVER_STATUSES.ONLINE,
    lastSeenAt: '2026-08-16T09:00:00.000Z',
    cpuUsagePercent: 12,
    diskUsedBytes: 50,
    diskTotalBytes: 100,
  }),
  server({
    id: '5',
    name: 'staging-01',
    status: SERVER_STATUSES.DEGRADED,
    lastSeenAt: '2026-08-16T09:00:00.000Z',
    cpuUsagePercent: 86,
    diskUsedBytes: 80,
    diskTotalBytes: 100,
  }),
];

const labels = {
  online: 'Online',
  warning: 'Warning',
  offline: 'Offline',
  connecting: 'Connecting',
  'no-agent': 'Agent not installed',
  'no-data': 'No data',
};

describe('dashboard compute', () => {
  it('counts all servers and online servers', () => {
    expect(countServers(fleet)).toBe(5);
    expect(countOnlineServers(fleet)).toBe(4);
    expect(onlinePercent(4, 5)).toBe(80);
  });

  it('computes average CPU from available values', () => {
    expect(averageCpu(fleet)).toBe(41.2);
    expect(averageCpu([])).toBeNull();
  });

  it('computes average disk usage and free space', () => {
    expect(averageDisk(fleet)).toBe(62);
    expect(ratioToPercent(62, 100)).toBe(62);
    expect(ratioToPercent(10, 0)).toBeNull();
    expect(computeSummary(fleet).diskFree).toBe(38);
  });

  it('builds a summary used by the overview cards', () => {
    expect(computeSummary(fleet)).toEqual({
      total: 5,
      online: 4,
      offline: 0,
      warning: 1,
      waitingAgent: 0,
      onlinePercent: 80,
      availabilityPercent: 80,
      averageCpu: 41.2,
      currentCpu: 41.2,
      averageRam: 52,
      averageDisk: 62,
      diskFree: 38,
      disconnectedAgents: 0,
      attentionCount: 2,
      cpuCoresUsed: null,
      cpuCoresTotal: null,
      memoryUsedBytes: 52,
      memoryTotalBytes: 100,
      diskUsedBytes: 310,
      diskTotalBytes: 500,
      maintenanceCount: 0,
    });
  });

  it('maps server statuses for the UI', () => {
    expect(toDashboardStatus(SERVER_STATUSES.ONLINE)).toBe('online');
    expect(toDashboardStatus(SERVER_STATUSES.DEGRADED)).toBe('warning');
    expect(toDashboardStatus(SERVER_STATUSES.OFFLINE)).toBe('offline');
    expect(toDashboardStatus(SERVER_STATUSES.PENDING)).toBe('no-agent');
    expect(toDashboardStatus(SERVER_STATUSES.PENDING, true)).toBe('connecting');
    expect(toDashboardStatus(SERVER_STATUSES.MAINTENANCE)).toBe('warning');
    expect(toDashboardStatus(SERVER_STATUSES.REVOKED)).toBe('offline');
  });

  it('limits the dashboard list to five servers', () => {
    const extra = [...fleet, server({ id: '6', name: 'extra', status: SERVER_STATUSES.ONLINE })];
    expect(selectDashboardServers(extra)).toHaveLength(5);
  });

  it('hides metrics when an agent was never installed', () => {
    const pending = toDashboardServer(
      server({
        id: 'p1',
        name: 'pending-01',
        status: SERVER_STATUSES.PENDING,
        cpuUsagePercent: 11,
      }),
    );
    expect(hasInstalledAgent(pending)).toBe(false);
    expect(pending.hasAgent).toBe(false);
    expect(pending.cpuPercent).toBeNull();
    expect(pending.ramPercent).toBeNull();
    expect(pending.lastSeenAt).toBeNull();
  });

  it('filters and searches servers by hostname, id, and status', () => {
    const mapped = fleet.map(toDashboardServer);
    expect(matchesServerSearch(mapped[0]!, 'prod', 'Online')).toBe(true);
    expect(matchesServerSearch(mapped[0]!, '1', 'Online')).toBe(true);
    expect(matchesServerSearch(mapped[0]!, 'offline', 'Online')).toBe(false);
    expect(filterDashboardServers(mapped, 'online', '', labels)).toHaveLength(4);
    expect(filterDashboardServers(mapped, 'attention', '', labels)).toHaveLength(2);
    expect(countServerFilters(mapped)).toEqual({ all: 5, online: 4, attention: 2 });
  });

  it('flags only the metric when load is high', () => {
    expect(isHighLoad(86)).toBe(true);
    expect(isHighLoad(38)).toBe(false);
    expect(isHighLoad(null)).toBe(false);
  });

  it('builds system status tones from real counters and unknown health', () => {
    const snapshot = buildSystemStatus({
      apiOk: true,
      databaseOk: null,
      gatewayOk: true,
      agentsConnected: 4,
      agentsTotal: 5,
    });
    expect(snapshot.api).toBe('ok');
    expect(snapshot.database).toBe('info');
    expect(snapshot.gateway).toBe('ok');
    expect(snapshot.platformReady).toBe(false);
    expect(snapshot.checks.find((check) => check.id === 'agents')?.tone).toBe('warning');
    expect(snapshot.checks.map((check) => check.id)).toEqual([
      'api',
      'database',
      'gateway',
      'agents',
    ]);
  });

  it('does not invent an agent count when the server list is unknown', () => {
    const snapshot = buildSystemStatus({
      apiOk: 'ok',
      databaseOk: 'ok',
      gatewayOk: 'ok',
      agentsConnected: null,
      agentsTotal: null,
    });
    expect(snapshot.agentsConnected).toBeNull();
    expect(snapshot.agentsTotal).toBeNull();
    expect(snapshot.checks.find((check) => check.id === 'agents')).toEqual({
      id: 'agents',
      tone: 'info',
      required: false,
      value: 'unknown',
    });
  });

  it('builds unique attention items from real problems', () => {
    const mixed = [
      ...fleet,
      server({ id: '6', name: 'gone', status: SERVER_STATUSES.OFFLINE }),
      server({ id: '7', name: 'revoked', status: SERVER_STATUSES.REVOKED }),
      server({ id: '8', name: 'pending', status: SERVER_STATUSES.PENDING }),
    ];
    expect(countDisconnectedAgents(mixed)).toBe(3);
    const items = buildAttentionItems({ servers: mixed, metricsError: true });
    expect(items.map((item) => item.id)).toEqual([
      'agents',
      'revoked',
      'offline',
      'highLoad',
      'metrics',
    ]);
    expect(items.find((item) => item.id === 'agents')?.count).toBe(1);
    expect(items.find((item) => item.id === 'offline')?.count).toBe(1);
    expect(
      buildAttentionItems({ servers: fleet, metricsError: false }).map((item) => item.id),
    ).toEqual(['highLoad']);
  });

  it('shows the connected dashboard as soon as a server is saved', () => {
    const pending = toDashboardServer(
      server({ id: 'p1', name: 'pending-01', status: SERVER_STATUSES.PENDING }),
    );
    expect(
      resolveDashboardMode({
        loading: false,
        servers: { status: 'empty', data: [], error: null },
      }),
    ).toBe('onboarding');
    expect(
      resolveDashboardMode({
        loading: false,
        servers: { status: 'success', data: [pending], error: null },
      }),
    ).toBe('connected');
    expect(
      resolveDashboardMode({
        loading: false,
        servers: { status: 'success', data: fleet.map(toDashboardServer), error: null },
      }),
    ).toBe('connected');
    expect(
      resolveDashboardMode({
        loading: false,
        servers: { status: 'error', data: null, error: 'generic' },
      }),
    ).toBe('servers-error');
  });

  it('keeps a saved pending server visible even if it still has leftover agent metadata', () => {
    const stale = toDashboardServer(
      server({
        id: 'smoke-01',
        name: 'smoke-01',
        status: SERVER_STATUSES.PENDING,
        agentVersion: '1.0.0',
        lastSeenAt: '2026-08-16T09:00:00.000Z',
        cpuUsagePercent: 11,
        memoryUsedBytes: 25,
        memoryTotalBytes: 100,
      }),
    );
    expect(stale.hasAgent).toBe(true);
    expect(
      resolveDashboardMode({
        loading: false,
        servers: { status: 'success', data: [stale], error: null },
      }),
    ).toBe('connected');
    const offline = toDashboardServer(
      server({
        id: 'edge-01',
        name: 'edge-01',
        status: SERVER_STATUSES.OFFLINE,
        agentVersion: '1.0.0',
        lastSeenAt: '2026-08-16T09:00:00.000Z',
      }),
    );
    expect(
      resolveDashboardMode({
        loading: false,
        servers: { status: 'success', data: [offline], error: null },
      }),
    ).toBe('connected');
  });

  it('computes setup progress from enrollment state', () => {
    const pending = toDashboardServer(
      server({ id: 'p1', name: 'pending-01', status: SERVER_STATUSES.PENDING }),
    );
    const empty = computeSetupProgress({ servers: [], serversError: false });
    expect(empty.done).toBe(0);
    expect(empty.steps[0]?.state).toBe('active');
    expect(computeSetupProgress({ servers: [], serversError: true }).steps[0]?.state).toBe(
      'active',
    );
    const created = computeSetupProgress({ servers: [pending], serversError: false });
    expect(created.done).toBe(1);
    expect(created.steps[0]?.state).toBe('completed');
    expect(created.steps[1]?.state).toBe('active');
    const enrolled = computeSetupProgress({
      servers: fleet.map(toDashboardServer),
      serversError: false,
    });
    expect(enrolled.done).toBe(3);
    expect(enrolled.steps[2]?.state).toBe('completed');
  });

  it('derives environments, OS families, and per-server issues from real fields', () => {
    const mapped = [
      toDashboardServer(
        server({
          id: '1',
          name: 'prod-01',
          status: SERVER_STATUSES.ONLINE,
          tags: ['web'],
          groupName: 'Production',
          spaceName: 'Production',
          osName: 'Ubuntu 24.04',
          agentStatus: 'CONNECTED',
          cpuUsagePercent: 90,
          agentVersion: '1.0.0',
          lastSeenAt: '2026-08-16T09:00:00.000Z',
        }),
      ),
      toDashboardServer(
        server({
          id: '2',
          name: 'stage-01',
          status: SERVER_STATUSES.PENDING,
          groupName: 'Staging',
          osName: 'Debian GNU/Linux',
          agentStatus: 'NOT_INSTALLED',
        }),
      ),
    ];
    expect(environmentKey(mapped[0]!)).toBe('Production');
    expect(environmentKey(mapped[1]!)).toBe('Staging');
    expect(osFamilyKey(mapped[0]!.osName)).toBe('ubuntu');
    expect(osFamilyKey(mapped[1]!.osName)).toBe('debian');
    const dist = computeInfrastructureDistribution(mapped);
    expect(dist.spaces.map((item) => item.id)).toEqual(['Production', 'Staging']);
    expect(buildAttentionIssues(mapped).map((item) => item.kind)).toEqual(['highCpu', 'no-agent']);
  });
});
