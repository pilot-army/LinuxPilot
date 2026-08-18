import type { ServerGroup } from '@linuxpilot/server-contracts';

export const GROUP_LAYOUTS = ['grid', 'list'] as const;
export type GroupLayout = (typeof GROUP_LAYOUTS)[number];

export const GROUP_FILTERS = [
  'all',
  'online',
  'warning',
  'offline',
  'withoutAgent',
  'empty',
] as const;
export type GroupFilter = (typeof GROUP_FILTERS)[number];

export const GROUP_SORTS = ['name', 'servers', 'status', 'createdAt', 'updatedAt'] as const;
export type GroupSort = (typeof GROUP_SORTS)[number];

export const GROUP_REFRESH_INTERVALS = [0, 15, 30, 60] as const;
export type GroupRefreshInterval = (typeof GROUP_REFRESH_INTERVALS)[number];

export const GROUPS_LAYOUT_STORAGE_KEY = 'linuxpilot.groups.layout';

export type GroupsQueryState = {
  q: string;
  filter: GroupFilter;
  tag: string;
  sort: GroupSort;
  layout: GroupLayout;
  refresh: GroupRefreshInterval;
};

export type GroupsListState = {
  items: ServerGroup[];
  ungroupedCount: number;
  status: 'loading' | 'refreshing' | 'success' | 'empty' | 'error';
  error: 'network' | 'forbidden' | 'generic' | null;
  lastSuccessfulAt: string | null;
};

export type SpacesPageMode =
  | 'loading'
  | 'error'
  | 'no-servers'
  | 'no-spaces'
  | 'filtered-empty'
  | 'workspace';
