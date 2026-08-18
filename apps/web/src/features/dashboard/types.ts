import type { AgentStatus, ServerStatus, ServerSummary } from '@linuxpilot/server-contracts';

export const CHART_PERIODS = ['1h', '6h', '24h', '7d'] as const;
export type ChartPeriod = (typeof CHART_PERIODS)[number];

export const DASHBOARD_SERVER_STATUSES = [
  'online',
  'warning',
  'offline',
  'connecting',
  'no-agent',
  'no-data',
] as const;
export type DashboardServerStatus = (typeof DASHBOARD_SERVER_STATUSES)[number];

export const SERVER_FILTERS = ['all', 'online', 'attention'] as const;
export type ServerFilter = (typeof SERVER_FILTERS)[number];

export const ACTIVITY_TYPES = ['success', 'information', 'warning', 'error'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_FILTERS = ['all', ...ACTIVITY_TYPES] as const;
export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number];

export const SYSTEM_TONES = ['ok', 'warning', 'error', 'info'] as const;
export type SystemTone = (typeof SYSTEM_TONES)[number];

export const DASHBOARD_MODES = ['loading', 'onboarding', 'connected', 'servers-error'] as const;
export type DashboardMode = (typeof DASHBOARD_MODES)[number];

export const SETUP_STEP_STATES = ['pending', 'active', 'completed', 'error'] as const;
export type SetupStepState = (typeof SETUP_STEP_STATES)[number];

export const SETUP_STEP_IDS = ['prepare', 'install', 'metrics'] as const;
export type SetupStepId = (typeof SETUP_STEP_IDS)[number];

export const ONBOARDING_STEP_IDS = ['connection', 'agent', 'access', 'ready'] as const;
export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number];

export const ATTENTION_KINDS = ['agents', 'revoked', 'offline', 'highLoad', 'metrics'] as const;
export type AttentionKind = (typeof ATTENTION_KINDS)[number];

export const ISSUE_KINDS = [
  'offline',
  'no-agent',
  'warning',
  'highCpu',
  'highRam',
  'highDisk',
  'outdated',
  'maintenance',
] as const;
export type IssueKind = (typeof ISSUE_KINDS)[number];

export const ISSUE_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export const AGENT_HEALTH_KEYS = ['current', 'outdated', 'missing', 'disconnected'] as const;
export type AgentHealthKey = (typeof AGENT_HEALTH_KEYS)[number];

export type DashboardErrorCode = 'network' | 'forbidden' | 'generic' | 'rateLimited';

export type WidgetStatus = 'idle' | 'loading' | 'refreshing' | 'success' | 'empty' | 'error';

export type DashboardServer = {
  id: string;
  name: string;
  hostname: string | null;
  ipAddress: string | null;
  status: DashboardServerStatus;
  sourceStatus: ServerStatus;
  cpuPercent: number | null;
  ramPercent: number | null;
  diskPercent: number | null;
  agentVersion: string | null;
  lastSeenAt: string | null;
  uptimeSeconds: number | null;
  hasAgent: boolean;
  osName: string | null;
  groupName: string | null;
  spaceName: string | null;
  tags: string[];
  agentStatus: AgentStatus;
  maintenanceMode: boolean;
  cpuCores: number | null;
  memoryUsedBytes: number | null;
  memoryTotalBytes: number | null;
  diskUsedBytes: number | null;
  diskTotalBytes: number | null;
};

export type DashboardSummary = {
  total: number;
  online: number;
  offline: number;
  warning: number;
  waitingAgent: number;
  onlinePercent: number;
  availabilityPercent: number;
  averageCpu: number | null;
  currentCpu: number | null;
  averageRam: number | null;
  averageDisk: number | null;
  diskFree: number | null;
  disconnectedAgents: number;
  attentionCount: number;
  cpuCoresUsed: number | null;
  cpuCoresTotal: number | null;
  memoryUsedBytes: number | null;
  memoryTotalBytes: number | null;
  diskUsedBytes: number | null;
  diskTotalBytes: number | null;
  maintenanceCount: number;
};

export type DistributionBucket = {
  id: string;
  count: number;
};

export type InfrastructureDistribution = {
  spaces: DistributionBucket[];
  /** @deprecated Use spaces */
  environments: DistributionBucket[];
  operatingSystems: DistributionBucket[];
  agents: DistributionBucket[];
};

export type MaintenanceSnapshot = {
  maintenanceCount: number;
  pendingOperations: number | null;
};

export type AttentionIssue = {
  id: string;
  serverId: string;
  serverName: string;
  kind: IssueKind;
  severity: IssueSeverity;
  createdAt: string | null;
  href: string;
};

export type DailyActivityPoint = {
  date: string;
  incidents: number;
  operations: number;
};

export type RecentConnection = {
  id: string;
  actor: string;
  serverName: string;
  createdAt: string;
};

export type LoadPoint = {
  timestamp: string;
  cpuPercent: number | null;
  ramPercent: number | null;
};

export type LoadSeries = {
  points: LoadPoint[];
  currentCpu: number | null;
  currentRam: number | null;
  lastMetricAt: string | null;
};

export type ActivityEvent = {
  id: string;
  type: ActivityType;
  action: string;
  serverName: string;
  createdAt: string;
};

export type SystemCheck = {
  id: 'api' | 'database' | 'gateway' | 'agents';
  tone: SystemTone;
  value: string;
  required: boolean;
};

export type SystemStatusSnapshot = {
  api: SystemTone;
  database: SystemTone;
  gateway: SystemTone;
  agentsConnected: number | null;
  agentsTotal: number | null;
  requiredReady: number;
  requiredTotal: number;
  platformReady: boolean;
  checks: SystemCheck[];
};

export type SetupStep = {
  id: SetupStepId;
  state: SetupStepState;
};

export type SetupProgress = {
  done: number;
  total: number;
  steps: SetupStep[];
};

export type EnrollmentPreview = {
  command: string;
  expiresAt: string;
  createdAt: string;
};

export type AttentionItem = {
  id: AttentionKind;
  tone: Exclude<SystemTone, 'ok' | 'info'>;
  count: number;
};

export type WidgetResult<T> = {
  status: 'success' | 'empty' | 'error';
  data: T | null;
  error: DashboardErrorCode | null;
  stale?: boolean;
};

export type DashboardSnapshot = {
  summary: DashboardSummary;
  servers: WidgetResult<DashboardServer[]>;
  load: WidgetResult<LoadSeries>;
  activity: WidgetResult<ActivityEvent[]>;
  system: WidgetResult<SystemStatusSnapshot>;
  attention: WidgetResult<AttentionItem[]>;
  issues: WidgetResult<AttentionIssue[]>;
  weekActivity: WidgetResult<DailyActivityPoint[]>;
  connections: WidgetResult<RecentConnection[]>;
  pendingOperations: number | null;
};

export type { GatewayHealth } from '../../api/health';
export type { ServerSummary };
