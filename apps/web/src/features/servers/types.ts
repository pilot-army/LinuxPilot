import type { ServerStatus, ServerSummary } from '@linuxpilot/server-contracts';

export const SERVER_VIEWS = [
  'all',
  'online',
  'offline',
  'warning',
  'noAgent',
  'maintenance',
] as const;
export type ServerView = (typeof SERVER_VIEWS)[number];

export const SERVER_LAYOUTS = ['table', 'grid'] as const;
export type ServerLayout = (typeof SERVER_LAYOUTS)[number];

export const AGENT_FILTERS = ['all', 'installed', 'missing'] as const;
export type AgentFilter = (typeof AGENT_FILTERS)[number];

export const REFRESH_INTERVALS = [0, 15, 30, 60, 300] as const;
export type RefreshInterval = (typeof REFRESH_INTERVALS)[number];

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export const LIST_SORTS = ['lastSeenAt', 'name', 'status', 'createdAt'] as const;
export type ListSort = (typeof LIST_SORTS)[number];

export const TABLE_COLUMNS = ['os', 'cpu', 'ram', 'disk', 'lastSeen'] as const;
export type TableColumn = (typeof TABLE_COLUMNS)[number];

export type ServersQueryState = {
  view: ServerView;
  q: string;
  status: ServerStatus | '';
  os: string;
  sort: ListSort;
  order: 'asc' | 'desc';
  page: number;
  pageSize: PageSize;
  serverId: string;
  spaceId: string;
  agent: AgentFilter;
  layout: ServerLayout;
  refresh: RefreshInterval;
};

export type ServerCounts = {
  all: number;
  online: number;
  offline: number;
  warning: number;
  noAgent: number;
  maintenance: number;
};

export type ServersListState = {
  items: ServerSummary[];
  total: number;
  page: number;
  pageSize: number;
  counts: ServerCounts;
  status: 'loading' | 'refreshing' | 'success' | 'empty' | 'error';
  error: 'network' | 'forbidden' | 'generic' | null;
  lastSuccessfulAt: string | null;
};

export type InspectorState = {
  status: 'idle' | 'loading' | 'success' | 'error';
  server: ServerSummary | null;
  lastEvent: { action: string; createdAt: string } | null;
  error: 'network' | 'forbidden' | 'generic' | null;
};
