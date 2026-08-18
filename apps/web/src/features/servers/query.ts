import { SERVER_STATUSES, type ServerStatus } from '@linuxpilot/server-contracts';
import {
  AGENT_FILTERS,
  LIST_SORTS,
  PAGE_SIZES,
  REFRESH_INTERVALS,
  SERVER_LAYOUTS,
  SERVER_VIEWS,
  type AgentFilter,
  type ListSort,
  type PageSize,
  type RefreshInterval,
  type ServerLayout,
  type ServersQueryState,
  type ServerView,
} from './types';

const STATUSES = new Set<string>(Object.values(SERVER_STATUSES));

export const defaultServersQuery: ServersQueryState = {
  view: 'all',
  q: '',
  status: '',
  os: '',
  sort: 'lastSeenAt',
  order: 'desc',
  page: 1,
  pageSize: 25,
  serverId: '',
  spaceId: '',
  agent: 'all',
  layout: 'table',
  refresh: 30,
};

export function parseServersQuery(params: URLSearchParams): ServersQueryState {
  const view = params.get('view');
  const sort = params.get('sort');
  const order = params.get('order');
  const page = Number(params.get('page'));
  const pageSize = Number(params.get('pageSize'));
  const layout = params.get('layout');
  const refresh = Number(params.get('refresh'));
  const status = params.get('status') ?? '';
  const agent = params.get('agent');

  return {
    view: isView(view) ? view : defaultServersQuery.view,
    q: (params.get('q') ?? '').slice(0, 100),
    status: STATUSES.has(status) ? (status as ServerStatus) : '',
    os: params.get('os') ?? '',
    sort: isSort(sort) ? sort : defaultServersQuery.sort,
    order: order === 'asc' || order === 'desc' ? order : defaultServersQuery.order,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: isPageSize(pageSize) ? pageSize : defaultServersQuery.pageSize,
    serverId: params.get('server') ?? '',
    spaceId: params.get('spaceId') ?? params.get('groupId') ?? '',
    agent: isAgent(agent) ? agent : defaultServersQuery.agent,
    layout: isLayout(layout) ? layout : defaultServersQuery.layout,
    refresh: isRefresh(refresh) ? refresh : defaultServersQuery.refresh,
  };
}

export function serializeServersQuery(state: ServersQueryState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.view !== defaultServersQuery.view) {
    params.set('view', state.view);
  }
  if (state.q.trim()) {
    params.set('q', state.q.trim());
  }
  if (state.status) {
    params.set('status', state.status);
  }
  if (state.os) {
    params.set('os', state.os);
  }
  if (state.sort !== defaultServersQuery.sort) {
    params.set('sort', state.sort);
  }
  if (state.order !== defaultServersQuery.order) {
    params.set('order', state.order);
  }
  if (state.page !== 1) {
    params.set('page', String(state.page));
  }
  if (state.pageSize !== defaultServersQuery.pageSize) {
    params.set('pageSize', String(state.pageSize));
  }
  if (state.serverId) {
    params.set('server', state.serverId);
  }
  if (state.spaceId) {
    params.set('spaceId', state.spaceId);
  }
  if (state.agent !== defaultServersQuery.agent) {
    params.set('agent', state.agent);
  }
  if (state.layout !== defaultServersQuery.layout) {
    params.set('layout', state.layout);
  }
  if (state.refresh !== defaultServersQuery.refresh) {
    params.set('refresh', String(state.refresh));
  }
  return params;
}

export function viewToStatus(view: ServerView): ServerStatus | '' {
  if (view === 'online') {
    return SERVER_STATUSES.ONLINE;
  }
  if (view === 'offline') {
    return SERVER_STATUSES.OFFLINE;
  }
  if (view === 'noAgent') {
    return SERVER_STATUSES.PENDING;
  }
  if (view === 'warning') {
    return SERVER_STATUSES.DEGRADED;
  }
  if (view === 'maintenance') {
    return SERVER_STATUSES.MAINTENANCE;
  }
  return '';
}

export function apiStatusForQuery(state: ServersQueryState): ServerStatus | '' {
  if (state.status) {
    return state.status;
  }
  return viewToStatus(state.view);
}

export function hasActiveServersFilters(state: ServersQueryState): boolean {
  return Boolean(
    state.q.trim() ||
      state.status ||
      state.os ||
      state.spaceId ||
      state.view !== defaultServersQuery.view ||
      state.agent !== defaultServersQuery.agent,
  );
}

export function countActiveServersFilters(state: ServersQueryState): number {
  let count = 0;
  if (state.status) {
    count += 1;
  }
  if (state.os) {
    count += 1;
  }
  if (state.spaceId) {
    count += 1;
  }
  if (state.agent !== defaultServersQuery.agent) {
    count += 1;
  }
  if (state.view !== defaultServersQuery.view) {
    count += 1;
  }
  return count;
}

function isAgent(value: string | null): value is AgentFilter {
  return AGENT_FILTERS.includes(value as AgentFilter);
}

function isView(value: string | null): value is ServerView {
  return SERVER_VIEWS.includes(value as ServerView);
}

function isSort(value: string | null): value is ListSort {
  return LIST_SORTS.includes(value as ListSort);
}

function isPageSize(value: number): value is PageSize {
  return PAGE_SIZES.includes(value as PageSize);
}

function isLayout(value: string | null): value is ServerLayout {
  return SERVER_LAYOUTS.includes(value as ServerLayout);
}

function isRefresh(value: number): value is RefreshInterval {
  return REFRESH_INTERVALS.includes(value as RefreshInterval);
}
