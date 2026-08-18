import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SERVER_STATUSES } from '@linuxpilot/server-contracts';
import { ApiRequestError } from '../../api/client';
import { loadDashboardSnapshot } from './dashboard-service';

const {
  listServersMock,
  getServerMetricsMock,
  listServerAuditMock,
  listServerOperationsMock,
  apiRequestMock,
} = vi.hoisted(() => ({
  listServersMock: vi.fn(),
  getServerMetricsMock: vi.fn(),
  listServerAuditMock: vi.fn(),
  listServerOperationsMock: vi.fn(),
  apiRequestMock: vi.fn(),
}));

vi.mock('../../api/servers', () => ({
  listServers: listServersMock,
  getServerMetrics: getServerMetricsMock,
  listServerAudit: listServerAuditMock,
  listServerOperations: listServerOperationsMock,
}));

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    apiRequest: apiRequestMock,
  };
});

describe('dashboard service', () => {
  beforeEach(() => {
    listServersMock.mockReset();
    getServerMetricsMock.mockReset();
    listServerAuditMock.mockReset();
    listServerOperationsMock.mockReset();
    apiRequestMock.mockReset();
    listServerAuditMock.mockResolvedValue({ items: [], page: 1, pageSize: 40, total: 0 });
    listServerOperationsMock.mockResolvedValue({ items: [], page: 1, pageSize: 100, total: 0 });
    apiRequestMock.mockResolvedValue({
      status: 'ok',
      service: 'api-gateway',
      dependencies: { authService: 'ok', serverService: 'ok' },
    });
  });

  it('loads servers and derives summary from the existing list API', async () => {
    listServersMock.mockResolvedValue({
      items: [
        {
          id: '1',
          name: 'prod-01',
          hostname: 'prod-01',
          description: '',
          status: SERVER_STATUSES.ONLINE,
          osName: null,
          osVersion: null,
          kernelVersion: null,
          architecture: null,
          agentVersion: null,
          lastSeenAt: '2026-08-16T09:00:00.000Z',
          createdAt: '2026-08-16T08:00:00.000Z',
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
          cpuUsagePercent: 38,
          memoryUsedBytes: 52,
          memoryTotalBytes: 100,
          diskUsedBytes: 62,
          diskTotalBytes: 100,
          uptimeSeconds: 100,
        },
      ],
      page: 1,
      pageSize: 100,
      total: 1,
    });
    getServerMetricsMock.mockResolvedValue({
      items: [
        {
          timestamp: '2026-08-16T08:00:00.000Z',
          cpuUsagePercent: 20,
          load1: null,
          load5: null,
          load15: null,
          memoryUsedBytes: 40,
          memoryTotalBytes: 100,
          swapUsedBytes: null,
          swapTotalBytes: null,
          uptimeSeconds: null,
          processCount: null,
          disks: [],
          incomplete: false,
          networkRxBytes: null,
          networkTxBytes: null,
        },
        {
          timestamp: '2026-08-16T09:00:00.000Z',
          cpuUsagePercent: 38,
          load1: null,
          load5: null,
          load15: null,
          memoryUsedBytes: 52,
          memoryTotalBytes: 100,
          swapUsedBytes: null,
          swapTotalBytes: null,
          uptimeSeconds: null,
          processCount: null,
          disks: [],
          incomplete: false,
          networkRxBytes: null,
          networkTxBytes: null,
        },
      ],
    });
    listServerAuditMock.mockResolvedValue({
      items: [
        {
          id: 'evt-1',
          action: 'server.enrollment.completed',
          actorId: null,
          requestId: null,
          createdAt: '2026-08-16T09:45:00.000Z',
          metadata: {},
          serverId: '1',
        },
      ],
    });

    const snapshot = await loadDashboardSnapshot('24h');

    expect(listServersMock).toHaveBeenCalled();
    expect(getServerMetricsMock).toHaveBeenCalled();
    expect(snapshot.summary.total).toBe(1);
    expect(snapshot.summary.online).toBe(1);
    expect(snapshot.servers.status).toBe('success');
    expect(snapshot.load.status).toBe('success');
    expect(snapshot.activity.data?.[0]?.action).toBe('server.enrollment.completed');
    expect(snapshot.system.data?.api).toBe('ok');
    expect(snapshot.system.data?.database).toBe('ok');
    expect(snapshot.attention.status).toBe('empty');
  });

  it('marks database as unknown when health does not expose it', async () => {
    listServersMock.mockResolvedValue({ items: [], page: 1, pageSize: 100, total: 0 });
    apiRequestMock.mockResolvedValue({ status: 'ok', service: 'api-gateway' });

    const snapshot = await loadDashboardSnapshot('1h');

    expect(snapshot.system.data?.api).toBe('ok');
    expect(snapshot.system.data?.database).toBe('info');
    expect(snapshot.system.data?.checks.find((check) => check.id === 'database')?.value).toBe(
      'unknown',
    );
  });

  it('marks database as unknown when health reports an unknown dependency', async () => {
    listServersMock.mockResolvedValue({ items: [], page: 1, pageSize: 100, total: 0 });
    apiRequestMock.mockResolvedValue({
      status: 'ok',
      service: 'api-gateway',
      dependencies: { authService: 'ok', serverService: 'unknown' },
    });

    const snapshot = await loadDashboardSnapshot('1h');

    expect(snapshot.system.status).toBe('success');
    expect(snapshot.system.data?.api).toBe('ok');
    expect(snapshot.system.data?.database).toBe('info');
    expect(snapshot.system.data?.checks.find((check) => check.id === 'database')?.value).toBe(
      'unknown',
    );
  });

  it('keeps other widgets available when the server list fails', async () => {
    listServersMock.mockRejectedValue(new ApiRequestError(503, 'GATEWAY_UNAVAILABLE', 'down'));

    const snapshot = await loadDashboardSnapshot('1h');

    expect(snapshot.servers.status).toBe('error');
    expect(snapshot.servers.error).toBe('generic');
    expect(snapshot.load.status).toBe('empty');
    expect(snapshot.system.status).toBe('success');
    expect(snapshot.system.data?.agentsConnected).toBeNull();
    expect(snapshot.system.data?.agentsTotal).toBeNull();
    expect(snapshot.activity.status).toBe('error');
    expect(snapshot.activity.data).toBeNull();
  });

  it('reuses an in-flight snapshot load for the same period', async () => {
    let resolveServers: (value: {
      items: never[];
      page: number;
      pageSize: number;
      total: number;
    }) => void = () => undefined;
    listServersMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveServers = resolve;
        }),
    );

    const first = loadDashboardSnapshot('1h');
    const second = loadDashboardSnapshot('1h');
    resolveServers({ items: [], page: 1, pageSize: 100, total: 0 });
    const [firstSnapshot, secondSnapshot] = await Promise.all([first, second]);

    expect(firstSnapshot).toBe(secondSnapshot);
    expect(listServersMock).toHaveBeenCalledTimes(1);
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
  });
});
