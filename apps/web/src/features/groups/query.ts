import {
  GROUP_FILTERS,
  GROUP_LAYOUTS,
  GROUP_REFRESH_INTERVALS,
  GROUP_SORTS,
  GROUPS_LAYOUT_STORAGE_KEY,
  type GroupFilter,
  type GroupLayout,
  type GroupRefreshInterval,
  type GroupSort,
  type GroupsQueryState,
} from './types';

export const defaultGroupsQuery: GroupsQueryState = {
  q: '',
  filter: 'all',
  tag: '',
  sort: 'name',
  layout: 'grid',
  refresh: 30,
};

export function parseGroupsQuery(params: URLSearchParams): GroupsQueryState {
  const filter = params.get('status');
  const sort = params.get('sort');
  const layout = params.get('layout');
  const refreshParam = params.get('refresh');
  const refresh = refreshParam === null ? defaultGroupsQuery.refresh : Number(refreshParam);

  return {
    q: (params.get('q') ?? '').slice(0, 100),
    filter: isFilter(filter) ? filter : defaultGroupsQuery.filter,
    tag: (params.get('tag') ?? '').slice(0, 64),
    sort: isSort(sort) ? sort : defaultGroupsQuery.sort,
    layout: isLayout(layout) ? layout : readStoredLayout(),
    refresh: isRefresh(refresh) ? refresh : defaultGroupsQuery.refresh,
  };
}

export function serializeGroupsQuery(state: GroupsQueryState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q.trim()) {
    params.set('q', state.q.trim());
  }
  if (state.filter !== defaultGroupsQuery.filter) {
    params.set('status', state.filter);
  }
  if (state.tag.trim()) {
    params.set('tag', state.tag.trim());
  }
  if (state.sort !== defaultGroupsQuery.sort) {
    params.set('sort', state.sort);
  }
  if (state.layout !== defaultGroupsQuery.layout) {
    params.set('layout', state.layout);
  }
  if (state.refresh !== defaultGroupsQuery.refresh && state.refresh !== 0) {
    params.set('refresh', String(state.refresh));
  }
  return params;
}

export function persistGroupsLayout(layout: GroupLayout) {
  try {
    window.localStorage.setItem(GROUPS_LAYOUT_STORAGE_KEY, layout);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

function readStoredLayout(): GroupLayout {
  try {
    const stored = window.localStorage.getItem(GROUPS_LAYOUT_STORAGE_KEY);
    if (isLayout(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage access failures.
  }
  return defaultGroupsQuery.layout;
}

function isFilter(value: string | null): value is GroupFilter {
  return GROUP_FILTERS.includes(value as GroupFilter);
}

function isSort(value: string | null): value is GroupSort {
  return GROUP_SORTS.includes(value as GroupSort);
}

function isLayout(value: string | null): value is GroupLayout {
  return GROUP_LAYOUTS.includes(value as GroupLayout);
}

function isRefresh(value: number): value is GroupRefreshInterval {
  return GROUP_REFRESH_INTERVALS.includes(value as GroupRefreshInterval);
}
