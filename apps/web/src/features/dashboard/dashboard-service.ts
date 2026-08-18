import type {
  ServerAuditEvent,
  ServerOperation,
  ServerSummary,
} from '@linuxpilot/server-contracts';
import { fetchGatewayHealth } from '../../api/health';
import {
  getServerMetrics,
  listServerAudit,
  listServerOperations,
  listServers,
} from '../../api/servers';
import {
  activityTypeForAction,
  bucketDailyActivity,
  buildAttentionItems,
  buildAttentionIssues,
  buildSystemStatus,
  computeLoadSeries,
  computeSummary,
  connectionEventsFromActivity,
  countConnectedAgents,
  deriveHighCpuEvents,
  mapDashboardServers,
  mergeActivityEvents,
  metricToLoadPoint,
  pickMetricsServer,
} from './compute';
import { rememberFleetTotal } from './fleet-presence';
import { periodWindow, toDashboardError } from './format';
import type {
  ActivityEvent,
  AttentionItem,
  ChartPeriod,
  DailyActivityPoint,
  DashboardSnapshot,
  LoadSeries,
  RecentConnection,
  SystemStatusSnapshot,
  WidgetResult,
} from './types';

const SERVER_PAGE_SIZE = 100;

let inFlightSnapshot: { period: ChartPeriod; promise: Promise<DashboardSnapshot> } | null = null;

export function loadDashboardSnapshot(period: ChartPeriod): Promise<DashboardSnapshot> {
  if (inFlightSnapshot && inFlightSnapshot.period === period) {
    return inFlightSnapshot.promise;
  }

  const promise = loadDashboardSnapshotNow(period).finally(() => {
    if (inFlightSnapshot?.promise === promise) {
      inFlightSnapshot = null;
    }
  });
  inFlightSnapshot = { period, promise };
  return promise;
}

async function loadDashboardSnapshotNow(period: ChartPeriod): Promise<DashboardSnapshot> {
  const serversResult = await loadServers();
  const serversKnown = serversResult.status !== 'error';
  const servers = serversResult.data ?? [];
  const total = serversResult.total ?? servers.length;
  rememberFleetTotal(serversKnown ? total : null);
  const summary = computeSummary(serversKnown ? servers : [], serversKnown ? total : 0);
  const mapped = mapDashboardServers(servers);

  const [load, activity, system, operations] = await Promise.all([
    loadChart(serversKnown ? servers : [], period, summary.currentCpu, summary.averageRam),
    loadActivity(serversKnown ? servers : null),
    loadSystemStatus(serversKnown ? servers : null),
    loadOperations(serversKnown ? servers : null),
  ]);

  const attention = loadAttention(servers, load.status === 'error');
  const issues = buildAttentionIssues(mapped);
  const weekActivity = buildWeekActivity(activity.data ?? [], operations.data ?? []);
  const connections = loadConnections(activity.data ?? []);

  return {
    summary,
    servers: {
      status: serversResult.status,
      data: serversResult.status === 'error' ? null : mapped,
      error: serversResult.error,
    },
    load,
    activity,
    system,
    attention,
    issues: {
      status: issues.length === 0 ? 'empty' : 'success',
      data: issues,
      error: null,
    },
    weekActivity,
    connections,
    pendingOperations: operations.pending,
  };
}

async function loadServers(): Promise<WidgetResult<ServerSummary[]> & { total?: number }> {
  try {
    const params = new URLSearchParams({
      page: '1',
      pageSize: String(SERVER_PAGE_SIZE),
      sort: 'createdAt',
      order: 'desc',
    });
    const result = await listServers(params);
    rememberFleetTotal(result.total);
    if (result.total === 0 || result.items.length === 0) {
      return { status: 'empty', data: [], error: null, total: result.total };
    }
    return { status: 'success', data: result.items, error: null, total: result.total };
  } catch (cause) {
    return { status: 'error', data: null, error: toDashboardError(cause) };
  }
}

async function loadChart(
  servers: ServerSummary[],
  period: ChartPeriod,
  currentCpu: number | null,
  currentRam: number | null,
): Promise<WidgetResult<LoadSeries>> {
  const target = pickMetricsServer(servers);
  if (!target) {
    return {
      status: 'empty',
      data: computeLoadSeries([], currentCpu, currentRam, null),
      error: null,
    };
  }

  try {
    const window = periodWindow(period);
    const params = new URLSearchParams({
      from: window.from,
      to: window.to,
      limit: String(window.limit),
    });
    const result = await getServerMetrics(target.id, params);
    const points = result.items.map(metricToLoadPoint);
    const lastMetricAt = points[points.length - 1]?.timestamp ?? target.lastSeenAt;
    const series = computeLoadSeries(points, currentCpu, currentRam, lastMetricAt);
    return {
      status: points.length === 0 ? 'empty' : 'success',
      data: series,
      error: null,
    };
  } catch (cause) {
    return {
      status: 'error',
      data: computeLoadSeries([], currentCpu, currentRam, target.lastSeenAt),
      error: toDashboardError(cause),
    };
  }
}

async function loadActivity(
  servers: ServerSummary[] | null,
): Promise<WidgetResult<ActivityEvent[]>> {
  if (servers === null) {
    return { status: 'error', data: null, error: 'generic' };
  }
  if (servers.length === 0) {
    return { status: 'empty', data: [], error: null };
  }

  const names = new Map(servers.map((server) => [server.id, server.name]));
  try {
    const params = new URLSearchParams({
      page: '1',
      pageSize: '40',
    });
    const result = await listServerAudit(params);
    const auditEvents = result.items.map((event) =>
      toActivityEvent(event, resolveAuditServerName(event, names)),
    );
    const merged = mergeActivityEvents(auditEvents, deriveHighCpuEvents(servers), 40);
    if (merged.length === 0) {
      return { status: 'empty', data: [], error: null };
    }
    return { status: 'success', data: merged, error: null };
  } catch (cause) {
    const derived = deriveHighCpuEvents(servers);
    if (derived.length > 0) {
      return { status: 'success', data: derived, error: toDashboardError(cause), stale: true };
    }
    return { status: 'error', data: null, error: toDashboardError(cause) };
  }
}

type OperationsWidget = WidgetResult<ServerOperation[]> & { pending: number | null };

async function loadOperations(servers: ServerSummary[] | null): Promise<OperationsWidget> {
  if (servers === null) {
    return { status: 'error', data: null, error: 'generic', pending: null };
  }
  if (servers.length === 0) {
    return { status: 'empty', data: [], error: null, pending: 0 };
  }
  try {
    const window = periodWindow('7d');
    const params = new URLSearchParams({
      page: '1',
      pageSize: '100',
      from: window.from,
      to: window.to,
    });
    const result = await listServerOperations(params);
    const pending = result.items.filter(
      (item) =>
        item.status === 'PENDING' || item.status === 'RUNNING' || item.status === 'DELIVERED',
    ).length;
    return {
      status: result.items.length === 0 ? 'empty' : 'success',
      data: result.items,
      error: null,
      pending,
    };
  } catch (cause) {
    return { status: 'error', data: null, error: toDashboardError(cause), pending: null };
  }
}

function buildWeekActivity(
  events: ActivityEvent[],
  operations: ServerOperation[],
): WidgetResult<DailyActivityPoint[]> {
  const incidents = events.filter((event) => event.type === 'warning' || event.type === 'error');
  const points = bucketDailyActivity(incidents, operations);
  const empty = points.every((point) => point.incidents === 0 && point.operations === 0);
  return {
    status: empty ? 'empty' : 'success',
    data: points,
    error: null,
  };
}

function loadConnections(events: ActivityEvent[]): WidgetResult<RecentConnection[]> {
  const items = connectionEventsFromActivity(events);
  return {
    status: items.length === 0 ? 'empty' : 'success',
    data: items,
    error: null,
  };
}

function mapHealthValue(value: string | undefined): 'ok' | 'degraded' | 'unavailable' | null {
  if (!value || value === 'unknown') {
    return null;
  }
  if (value === 'ok') {
    return 'ok';
  }
  if (value === 'degraded') {
    return 'degraded';
  }
  return 'unavailable';
}

async function loadSystemStatus(
  servers: ServerSummary[] | null,
): Promise<WidgetResult<SystemStatusSnapshot>> {
  let apiOk: boolean | 'ok' | 'degraded' | 'unavailable' | null = null;
  let databaseOk: boolean | 'ok' | 'degraded' | 'unavailable' | null = null;
  let gatewayOk: boolean | 'ok' | 'degraded' | 'unavailable' | null = null;

  try {
    const health = await fetchGatewayHealth();
    gatewayOk = mapHealthValue(health.status);
    apiOk = mapHealthValue(health.dependencies?.authService) ?? gatewayOk;
    databaseOk = mapHealthValue(health.dependencies?.serverService);
    if (health.dependencies?.authService === 'unavailable') {
      apiOk = 'degraded';
    }
  } catch {
    apiOk = null;
    databaseOk = null;
    gatewayOk = null;
  }

  const snapshot = buildSystemStatus({
    apiOk,
    databaseOk,
    gatewayOk,
    agentsConnected: servers ? countConnectedAgents(servers) : null,
    agentsTotal: servers ? servers.length : null,
  });

  const unknown = apiOk === null && databaseOk === null && gatewayOk === null;
  return {
    status: unknown ? 'error' : 'success',
    data: snapshot,
    error: unknown ? 'network' : null,
  };
}

function loadAttention(
  servers: ServerSummary[],
  metricsError: boolean,
): WidgetResult<AttentionItem[]> {
  const items = buildAttentionItems({ servers, metricsError });
  if (items.length === 0) {
    return { status: 'empty', data: [], error: null };
  }
  return { status: 'success', data: items, error: null };
}

function toActivityEvent(event: ServerAuditEvent, serverName: string): ActivityEvent {
  return {
    id: event.id,
    type: activityTypeForAction(event.action),
    serverName,
    createdAt: event.createdAt,
    action: event.action,
  };
}

function resolveAuditServerName(event: ServerAuditEvent, names: Map<string, string>): string {
  if (event.serverId && names.has(event.serverId)) {
    return names.get(event.serverId) ?? '—';
  }
  const fromMeta = event.metadata.serverName;
  if (typeof fromMeta === 'string' && fromMeta.trim()) {
    return fromMeta;
  }
  return '—';
}
