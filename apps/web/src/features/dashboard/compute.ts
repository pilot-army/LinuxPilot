import {
  AGENT_STATUSES,
  SERVER_STATUSES,
  type AgentStatus,
  type ServerStatus,
  type ServerSummary,
} from '@linuxpilot/server-contracts';
import type {
  ActivityEvent,
  ActivityFilter,
  ActivityType,
  AgentHealthKey,
  AttentionIssue,
  AttentionItem,
  DashboardMode,
  DashboardServer,
  DashboardServerStatus,
  DashboardSummary,
  DailyActivityPoint,
  DistributionBucket,
  InfrastructureDistribution,
  IssueKind,
  IssueSeverity,
  LoadPoint,
  LoadSeries,
  RecentConnection,
  ServerFilter,
  SetupProgress,
  SetupStepState,
  SystemCheck,
  SystemStatusSnapshot,
  SystemTone,
  WidgetResult,
} from './types';

export const HIGH_LOAD_THRESHOLD = 80;
export const DASHBOARD_SERVER_LIMIT = 5;
export const DASHBOARD_ACTIVITY_LIMIT = 4;
export const DASHBOARD_ISSUE_LIMIT = 6;
export const DASHBOARD_CONNECTION_LIMIT = 5;

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

export function ratioToPercent(used: number | null, total: number | null): number | null {
  if (used === null || total === null || total <= 0) {
    return null;
  }
  return clampPercent((used / total) * 100);
}

export function average(values: Array<number | null | undefined>): number | null {
  const numbers = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  );
  if (numbers.length === 0) {
    return null;
  }
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

export function isOnlineStatus(status: ServerStatus): boolean {
  return status === SERVER_STATUSES.ONLINE;
}

export function isConnectedStatus(status: ServerStatus): boolean {
  return status === SERVER_STATUSES.ONLINE || status === SERVER_STATUSES.DEGRADED;
}

export function hasInstalledAgent(
  server: Pick<ServerSummary, 'agentVersion' | 'lastSeenAt'>,
): boolean {
  return server.agentVersion !== null || server.lastSeenAt !== null;
}

export function toDashboardStatus(status: ServerStatus, hasAgent = false): DashboardServerStatus {
  if (status === SERVER_STATUSES.ONLINE) {
    return 'online';
  }
  if (status === SERVER_STATUSES.DEGRADED || status === SERVER_STATUSES.MAINTENANCE) {
    return 'warning';
  }
  if (status === SERVER_STATUSES.OFFLINE || status === SERVER_STATUSES.REVOKED) {
    return 'offline';
  }
  if (status === SERVER_STATUSES.PENDING) {
    return hasAgent ? 'connecting' : 'no-agent';
  }
  return 'no-data';
}

export function needsAttention(
  server: Pick<DashboardServer, 'status' | 'cpuPercent' | 'ramPercent' | 'diskPercent'>,
): boolean {
  if (server.status !== 'online') {
    return true;
  }
  return (
    isHighLoad(server.cpuPercent) || isHighLoad(server.ramPercent) || isHighLoad(server.diskPercent)
  );
}

export function countServers(servers: ServerSummary[]): number {
  return servers.length;
}

export function countOnlineServers(servers: ServerSummary[]): number {
  return servers.filter((server) => isOnlineStatus(server.status)).length;
}

export function countConnectedAgents(servers: ServerSummary[]): number {
  return servers.filter((server) => isConnectedStatus(server.status)).length;
}

export function countDisconnectedAgents(servers: ServerSummary[]): number {
  return servers.filter((server) => !isConnectedStatus(server.status)).length;
}

export function averageCpu(servers: ServerSummary[]): number | null {
  return average(servers.map((server) => server.cpuUsagePercent));
}

export function averageRam(servers: ServerSummary[]): number | null {
  return average(
    servers.map((server) => ratioToPercent(server.memoryUsedBytes, server.memoryTotalBytes)),
  );
}

export function averageDisk(servers: ServerSummary[]): number | null {
  return average(
    servers.map((server) => ratioToPercent(server.diskUsedBytes, server.diskTotalBytes)),
  );
}

export function onlinePercent(online: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((online / total) * 100);
}

export function computeSummary(servers: ServerSummary[], total = servers.length): DashboardSummary {
  const mapped = mapDashboardServers(servers);
  const online = countOnlineServers(servers);
  const cpu = averageCpu(servers);
  const disk = averageDisk(servers);
  const cpuCoresTotal = sum(servers.map((server) => server.cpuCores));
  const cpuCoresUsed = sum(
    servers.map((server) => {
      if (server.cpuCores === null || server.cpuUsagePercent === null) {
        return null;
      }
      return (server.cpuCores * clampPercent(server.cpuUsagePercent)) / 100;
    }),
  );
  const memoryUsedBytes = sum(servers.map((server) => server.memoryUsedBytes));
  const memoryTotalBytes = sum(servers.map((server) => server.memoryTotalBytes));
  const diskUsedBytes = sum(servers.map((server) => server.diskUsedBytes));
  const diskTotalBytes = sum(servers.map((server) => server.diskTotalBytes));
  const availability = onlinePercent(online, total);
  return {
    total,
    online,
    offline: mapped.filter((server) => server.status === 'offline').length,
    warning: mapped.filter((server) => server.status === 'warning').length,
    waitingAgent: mapped.filter((server) => server.status === 'no-agent').length,
    onlinePercent: availability,
    availabilityPercent: availability,
    averageCpu: cpu,
    currentCpu: cpu,
    averageRam: averageRam(servers),
    averageDisk: disk,
    diskFree: disk === null ? null : clampPercent(100 - disk),
    disconnectedAgents: countDisconnectedAgents(servers),
    attentionCount: mapped.filter(needsAttention).length,
    cpuCoresUsed,
    cpuCoresTotal,
    memoryUsedBytes,
    memoryTotalBytes,
    diskUsedBytes,
    diskTotalBytes,
    maintenanceCount: servers.filter((server) => server.maintenanceMode).length,
  };
}

export function toDashboardServer(server: ServerSummary): DashboardServer {
  const hasAgent = hasInstalledAgent(server);
  return {
    id: server.id,
    name: server.name,
    hostname: server.hostname,
    ipAddress: server.primaryIp,
    status: toDashboardStatus(server.status, hasAgent),
    sourceStatus: server.status,
    cpuPercent:
      hasAgent && server.cpuUsagePercent !== null ? clampPercent(server.cpuUsagePercent) : null,
    ramPercent: hasAgent ? ratioToPercent(server.memoryUsedBytes, server.memoryTotalBytes) : null,
    diskPercent: hasAgent ? ratioToPercent(server.diskUsedBytes, server.diskTotalBytes) : null,
    agentVersion: server.agentVersion,
    lastSeenAt: server.lastSeenAt,
    uptimeSeconds: hasAgent ? server.uptimeSeconds : null,
    hasAgent,
    osName: server.osName,
    groupName: server.groupName ?? server.spaceName ?? null,
    spaceName: server.spaceName ?? server.groupName ?? null,
    tags: server.tags,
    agentStatus: server.agentStatus,
    maintenanceMode: server.maintenanceMode,
    cpuCores: server.cpuCores,
    memoryUsedBytes: hasAgent ? server.memoryUsedBytes : null,
    memoryTotalBytes: hasAgent ? server.memoryTotalBytes : null,
    diskUsedBytes: hasAgent ? server.diskUsedBytes : null,
    diskTotalBytes: hasAgent ? server.diskTotalBytes : null,
  };
}

export function mapDashboardServers(servers: ServerSummary[]): DashboardServer[] {
  return servers.map(toDashboardServer);
}

export function selectDashboardServers(servers: ServerSummary[]): DashboardServer[] {
  return mapDashboardServers(servers).slice(0, DASHBOARD_SERVER_LIMIT);
}

export function matchesServerSearch(
  server: DashboardServer,
  query: string,
  statusLabel: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const haystack = [
    server.name,
    server.hostname,
    server.id,
    server.ipAddress,
    server.status,
    statusLabel,
    server.agentVersion,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

export function matchesServerFilter(server: DashboardServer, filter: ServerFilter): boolean {
  if (filter === 'online') {
    return server.status === 'online';
  }
  if (filter === 'attention') {
    return needsAttention(server);
  }
  return true;
}

export function filterDashboardServers(
  servers: DashboardServer[],
  filter: ServerFilter,
  query: string,
  statusLabels: Record<DashboardServerStatus, string>,
): DashboardServer[] {
  return servers.filter(
    (server) =>
      matchesServerFilter(server, filter) &&
      matchesServerSearch(server, query, statusLabels[server.status]),
  );
}

export function countServerFilters(servers: DashboardServer[]): Record<ServerFilter, number> {
  return {
    all: servers.length,
    online: servers.filter((server) => server.status === 'online').length,
    attention: servers.filter((server) => needsAttention(server)).length,
  };
}

export function fleetHealthTone(
  servers: Array<Pick<DashboardServer, 'status' | 'cpuPercent' | 'ramPercent' | 'diskPercent'>>,
): SystemTone {
  if (servers.some((server) => server.status === 'offline')) {
    return 'error';
  }
  if (servers.some((server) => needsAttention(server))) {
    return 'warning';
  }
  return 'ok';
}

export function filterActivityEvents(
  events: ActivityEvent[],
  filter: ActivityFilter,
  limit = DASHBOARD_ACTIVITY_LIMIT,
): ActivityEvent[] {
  const filtered = filter === 'all' ? events : events.filter((event) => event.type === filter);
  return filtered.slice(0, limit);
}

export function isHighLoad(value: number | null): boolean {
  return value !== null && value >= HIGH_LOAD_THRESHOLD;
}

export function computeLoadSeries(
  points: LoadPoint[],
  currentCpu: number | null,
  currentRam: number | null,
  lastMetricAt: string | null = null,
): LoadSeries {
  const lastPoint = points[points.length - 1];
  return {
    points,
    currentCpu,
    currentRam,
    lastMetricAt: lastMetricAt ?? lastPoint?.timestamp ?? null,
  };
}

export function metricToLoadPoint(item: {
  timestamp: string;
  cpuUsagePercent: number | null;
  memoryUsedBytes: number | null;
  memoryTotalBytes: number | null;
}): LoadPoint {
  return {
    timestamp: item.timestamp,
    cpuPercent: item.cpuUsagePercent === null ? null : clampPercent(item.cpuUsagePercent),
    ramPercent: ratioToPercent(item.memoryUsedBytes, item.memoryTotalBytes),
  };
}

export function pickMetricsServer(servers: ServerSummary[]): ServerSummary | null {
  return (
    servers.find((server) => isOnlineStatus(server.status) && server.cpuUsagePercent !== null) ??
    servers.find((server) => isConnectedStatus(server.status)) ??
    servers.find((server) => hasInstalledAgent(server)) ??
    servers[0] ??
    null
  );
}

export function activityTypeForAction(action: string): ActivityType {
  if (
    action === 'server.enrollment.completed' ||
    action === 'server.created' ||
    action === 'server.status.online'
  ) {
    return 'success';
  }
  if (
    action === 'server.enrollment.failed' ||
    action === 'server.agent.auth_failed' ||
    action === 'server.revoked' ||
    action === 'server.deleted'
  ) {
    return 'error';
  }
  if (
    action === 'server.status.offline' ||
    action === 'high_cpu' ||
    action === 'server.credential.revoked'
  ) {
    return 'warning';
  }
  return 'information';
}

export function deriveHighCpuEvents(servers: ServerSummary[]): ActivityEvent[] {
  return servers
    .filter((server) => isHighLoad(server.cpuUsagePercent))
    .map((server) => ({
      id: `high-cpu-${server.id}`,
      type: 'warning' as const,
      action: 'high_cpu',
      serverName: server.name,
      createdAt: server.lastSeenAt ?? server.updatedAt,
    }));
}

export function mergeActivityEvents(
  auditEvents: ActivityEvent[],
  derivedEvents: ActivityEvent[],
  limit = DASHBOARD_ACTIVITY_LIMIT,
): ActivityEvent[] {
  return [...auditEvents, ...derivedEvents]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, limit);
}

export function toneFromKnown(ok: boolean | null): SystemTone {
  if (ok === null) {
    return 'info';
  }
  return ok ? 'ok' : 'error';
}

export function toneFromHealth(
  value: boolean | 'ok' | 'degraded' | 'unavailable' | null,
): SystemTone {
  if (value === null) {
    return 'info';
  }
  if (value === true || value === 'ok') {
    return 'ok';
  }
  if (value === 'degraded') {
    return 'warning';
  }
  return 'error';
}

export function buildSystemStatus(input: {
  apiOk: boolean | 'ok' | 'degraded' | 'unavailable' | null;
  databaseOk: boolean | 'ok' | 'degraded' | 'unavailable' | null;
  gatewayOk: boolean | 'ok' | 'degraded' | 'unavailable' | null;
  agentsConnected: number | null;
  agentsTotal: number | null;
}): SystemStatusSnapshot {
  const api = toneFromHealth(input.apiOk);
  const database = toneFromHealth(input.databaseOk);
  const gateway = toneFromHealth(input.gatewayOk);
  const agentsKnown = input.agentsConnected !== null && input.agentsTotal !== null;
  const agentRatio =
    input.agentsConnected === null || input.agentsTotal === null || input.agentsTotal === 0
      ? 1
      : input.agentsConnected / input.agentsTotal;
  const agents: SystemTone = !agentsKnown
    ? 'info'
    : input.agentsTotal === 0
      ? 'info'
      : agentRatio < 1
        ? 'warning'
        : 'ok';

  const checks: SystemCheck[] = [
    {
      id: 'api',
      tone: api,
      required: true,
      value: valueFromTone(api, input.apiOk),
    },
    {
      id: 'database',
      tone: database,
      required: true,
      value: valueFromTone(database, input.databaseOk),
    },
    {
      id: 'gateway',
      tone: gateway,
      required: true,
      value: valueFromTone(gateway, input.gatewayOk),
    },
    {
      id: 'agents',
      tone: agents,
      required: false,
      value: agentsKnown ? String(input.agentsConnected) : 'unknown',
    },
  ];

  const required = checks.filter((check) => check.required);
  const requiredReady = required.filter((check) => check.tone === 'ok').length;

  return {
    api,
    database,
    gateway,
    agentsConnected: input.agentsConnected,
    agentsTotal: input.agentsTotal,
    requiredReady,
    requiredTotal: required.length,
    platformReady: requiredReady === required.length && required.length > 0,
    checks,
  };
}

function valueFromTone(
  tone: SystemTone,
  raw: boolean | 'ok' | 'degraded' | 'unavailable' | null,
): string {
  if (raw === null || tone === 'info') {
    return 'unknown';
  }
  if (tone === 'ok') {
    return 'ok';
  }
  if (tone === 'warning') {
    return 'degraded';
  }
  return 'unavailable';
}

export function resolveDashboardMode(input: {
  loading: boolean;
  servers: WidgetResult<DashboardServer[]>;
}): DashboardMode {
  if (input.loading) {
    return 'loading';
  }
  const servers = input.servers.data ?? [];
  if (input.servers.status === 'error' && servers.length === 0) {
    return 'servers-error';
  }
  if (servers.length === 0) {
    return 'onboarding';
  }
  return 'connected';
}

export function computeSetupProgress(input: {
  servers: DashboardServer[] | null;
  serversError: boolean;
}): SetupProgress {
  void input.serversError;
  const servers = input.servers ?? [];
  const created = servers.length > 0;
  const enrolled = servers.some((server) => server.hasAgent);
  const metrics = servers.some(
    (server) => server.hasAgent && (server.cpuPercent !== null || server.ramPercent !== null),
  );

  const prepare = stepState({
    completed: created,
    error: false,
    active: !created,
  });
  const install = stepState({
    completed: enrolled,
    error: false,
    active: created && !enrolled,
  });
  const metricsStep = stepState({
    completed: metrics,
    error: false,
    active: enrolled && !metrics,
  });

  const done = [prepare, install, metricsStep].filter((state) => state === 'completed').length;

  return {
    done,
    total: 3,
    steps: [
      { id: 'prepare', state: prepare },
      { id: 'install', state: install },
      { id: 'metrics', state: metricsStep },
    ],
  };
}

function stepState(input: { completed: boolean; error: boolean; active: boolean }): SetupStepState {
  if (input.error) {
    return 'error';
  }
  if (input.completed) {
    return 'completed';
  }
  if (input.active) {
    return 'active';
  }
  return 'pending';
}

export function mergeServerWidget(
  previous: WidgetResult<DashboardServer[]>,
  next: WidgetResult<DashboardServer[]>,
): WidgetResult<DashboardServer[]> {
  if (next.status !== 'error') {
    return next;
  }
  if (previous.data && previous.data.length > 0) {
    return {
      status: previous.status === 'empty' ? 'empty' : 'success',
      data: previous.data,
      error: next.error,
      stale: true,
    };
  }
  return {
    ...next,
    data: previous.data,
    stale: Boolean(previous.data),
  };
}

export function buildAttentionItems(input: {
  servers: ServerSummary[];
  metricsError: boolean;
}): AttentionItem[] {
  const items: AttentionItem[] = [];
  const revoked = input.servers.filter(
    (server) => server.status === SERVER_STATUSES.REVOKED,
  ).length;
  const offline = input.servers.filter(
    (server) => server.status === SERVER_STATUSES.OFFLINE,
  ).length;
  const disconnected = input.servers.filter(
    (server) =>
      !isConnectedStatus(server.status) &&
      server.status !== SERVER_STATUSES.OFFLINE &&
      server.status !== SERVER_STATUSES.REVOKED,
  ).length;
  const highLoad = input.servers.filter((server) => isHighLoad(server.cpuUsagePercent)).length;

  if (disconnected > 0) {
    items.push({ id: 'agents', tone: 'warning', count: disconnected });
  }
  if (revoked > 0) {
    items.push({ id: 'revoked', tone: 'error', count: revoked });
  }
  if (offline > 0) {
    items.push({ id: 'offline', tone: 'error', count: offline });
  }
  if (highLoad > 0) {
    items.push({ id: 'highLoad', tone: 'warning', count: highLoad });
  }
  if (input.metricsError) {
    items.push({ id: 'metrics', tone: 'error', count: 1 });
  }

  return items;
}

export function loadScore(
  server: Pick<DashboardServer, 'cpuPercent' | 'ramPercent' | 'diskPercent'>,
): number {
  return Math.max(server.cpuPercent ?? 0, server.ramPercent ?? 0, server.diskPercent ?? 0);
}

export function selectTopLoadedServers(
  servers: DashboardServer[],
  limit = DASHBOARD_SERVER_LIMIT,
): DashboardServer[] {
  return [...servers]
    .sort((left, right) => {
      const delta = loadScore(right) - loadScore(left);
      if (delta !== 0) {
        return delta;
      }
      return left.name.localeCompare(right.name);
    })
    .slice(0, limit);
}

export function spaceKey(server: Pick<DashboardServer, 'spaceName' | 'groupName'>): string {
  const space = (server.spaceName ?? server.groupName)?.trim();
  if (!space) {
    return 'unassigned';
  }
  return space;
}

/** @deprecated Use spaceKey */
export function environmentKey(
  server: Pick<DashboardServer, 'tags' | 'groupName' | 'spaceName'>,
): string {
  return spaceKey(server);
}

export function osFamilyKey(osName: string | null | undefined): string {
  if (!osName || osName.trim().length === 0 || osName === 'unknown') {
    return 'unknown';
  }
  const value = osName.toLowerCase();
  if (value.includes('ubuntu')) {
    return 'ubuntu';
  }
  if (value.includes('debian')) {
    return 'debian';
  }
  if (value.includes('alma')) {
    return 'almalinux';
  }
  if (value.includes('rocky')) {
    return 'rocky';
  }
  return osName;
}

export function agentHealthKey(status: AgentStatus): AgentHealthKey {
  if (status === AGENT_STATUSES.CONNECTED) {
    return 'current';
  }
  if (status === AGENT_STATUSES.OUTDATED) {
    return 'outdated';
  }
  if (status === AGENT_STATUSES.NOT_INSTALLED) {
    return 'missing';
  }
  return 'disconnected';
}

function countBy(keys: string[]): DistributionBucket[] {
  const counts = new Map<string, number>();
  for (const key of keys) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((left, right) => right.count - left.count || left.id.localeCompare(right.id));
}

export function computeInfrastructureDistribution(
  servers: DashboardServer[],
): InfrastructureDistribution {
  const spaces = countBy(servers.map(spaceKey));
  return {
    spaces,
    environments: spaces,
    operatingSystems: countBy(servers.map((server) => osFamilyKey(server.osName))),
    agents: countBy(servers.map((server) => agentHealthKey(server.agentStatus))),
  };
}

export function buildAttentionIssues(servers: DashboardServer[]): AttentionIssue[] {
  const issues: AttentionIssue[] = [];
  for (const server of servers) {
    const href = `/servers/${server.id}`;
    if (server.status === 'offline') {
      issues.push(issue(server, 'offline', 'critical', href));
    } else if (server.status === 'no-agent') {
      issues.push(issue(server, 'no-agent', 'high', href));
    }
    if (isHighLoad(server.diskPercent)) {
      issues.push(issue(server, 'highDisk', 'critical', href));
    }
    if (isHighLoad(server.cpuPercent)) {
      issues.push(issue(server, 'highCpu', 'high', href));
    }
    if (isHighLoad(server.ramPercent)) {
      issues.push(issue(server, 'highRam', 'medium', href));
    }
    if (server.status === 'warning' && !server.maintenanceMode) {
      issues.push(issue(server, 'warning', 'medium', href));
    }
    if (server.agentStatus === AGENT_STATUSES.OUTDATED) {
      issues.push(issue(server, 'outdated', 'low', href));
    }
    if (server.maintenanceMode) {
      issues.push(issue(server, 'maintenance', 'low', href));
    }
  }
  return issues
    .sort((left, right) => severityRank(left.severity) - severityRank(right.severity))
    .slice(0, DASHBOARD_ISSUE_LIMIT);
}

function issue(
  server: DashboardServer,
  kind: IssueKind,
  severity: IssueSeverity,
  href: string,
): AttentionIssue {
  return {
    id: `${server.id}-${kind}`,
    serverId: server.id,
    serverName: server.name,
    kind,
    severity,
    createdAt: server.lastSeenAt,
    href,
  };
}

function severityRank(severity: IssueSeverity): number {
  if (severity === 'critical') {
    return 0;
  }
  if (severity === 'high') {
    return 1;
  }
  if (severity === 'medium') {
    return 2;
  }
  return 3;
}

export function bucketDailyActivity(
  incidents: Array<{ createdAt: string }>,
  operations: Array<{ createdAt: string }>,
  days = 7,
  now = Date.now(),
): DailyActivityPoint[] {
  const points: DailyActivityPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = dateKey(date);
    points.push({
      date: key,
      incidents: incidents.filter((item) => dateKey(new Date(item.createdAt)) === key).length,
      operations: operations.filter((item) => dateKey(new Date(item.createdAt)) === key).length,
    });
  }
  return points;
}

export function connectionEventsFromActivity(
  events: ActivityEvent[],
  limit = DASHBOARD_CONNECTION_LIMIT,
): RecentConnection[] {
  return events
    .filter((event) => isConnectionAction(event.action))
    .slice(0, limit)
    .map((event) => ({
      id: event.id,
      actor: 'system',
      serverName: event.serverName,
      createdAt: event.createdAt,
    }));
}

export function isConnectionAction(action: string): boolean {
  return (
    action === 'server.enrollment.completed' ||
    action === 'server.status.online' ||
    action === 'AGENT_CONNECTED' ||
    action === 'server.created'
  );
}

export function greetingPeriod(now = new Date()): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) {
    return 'morning';
  }
  if (hour >= 12 && hour < 18) {
    return 'afternoon';
  }
  if (hour >= 18 && hour < 23) {
    return 'evening';
  }
  return 'night';
}

function dateKey(value: Date): string {
  if (Number.isNaN(value.getTime())) {
    return '';
  }
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numbers = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  );
  if (numbers.length === 0) {
    return null;
  }
  return numbers.reduce((total, value) => total + value, 0);
}
