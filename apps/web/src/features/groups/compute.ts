import type { ServerGroup } from '@linuxpilot/server-contracts';
import type { GroupFilter, GroupSort, SpacesPageMode } from './types';

export function matchesGroupQuery(
  group: ServerGroup,
  query: { q: string; filter: GroupFilter; tag?: string },
): boolean {
  if (!matchesFilter(group, query.filter)) {
    return false;
  }
  if (query.tag && !group.tags.some((tag) => tag.toLowerCase() === query.tag?.toLowerCase())) {
    return false;
  }
  const needle = query.q.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const haystack = [group.name, group.description, ...group.tags, ...group.memberNames]
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

export function matchesFilter(group: ServerGroup, filter: GroupFilter): boolean {
  if (filter === 'online') {
    return group.onlineCount > 0;
  }
  if (filter === 'warning') {
    return group.warningCount > 0;
  }
  if (filter === 'offline') {
    return group.offlineCount > 0;
  }
  if (filter === 'withoutAgent') {
    return group.withoutAgentCount > 0;
  }
  if (filter === 'empty') {
    return group.serverCount === 0;
  }
  return true;
}

export function sortGroups(items: ServerGroup[], sort: GroupSort): ServerGroup[] {
  const next = [...items];
  next.sort((left, right) => {
    if (sort === 'servers') {
      return right.serverCount - left.serverCount || left.name.localeCompare(right.name);
    }
    if (sort === 'status') {
      return groupHealthRank(left) - groupHealthRank(right) || left.name.localeCompare(right.name);
    }
    if (sort === 'createdAt') {
      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    }
    if (sort === 'updatedAt') {
      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    }
    return left.name.localeCompare(right.name);
  });
  return next;
}

export function groupHealthRank(group: ServerGroup): number {
  if (group.offlineCount > 0 || group.withoutAgentCount > 0) {
    return 0;
  }
  if (group.warningCount > 0) {
    return 1;
  }
  if (group.onlineCount > 0) {
    return 2;
  }
  return 3;
}

export function filterAndSortGroups(
  items: ServerGroup[],
  query: { q: string; filter: GroupFilter; sort: GroupSort; tag?: string },
): ServerGroup[] {
  return sortGroups(
    items.filter((group) => matchesGroupQuery(group, query)),
    query.sort,
  );
}

export function uniqueSpaceTags(items: ServerGroup[]): string[] {
  return [...new Set(items.flatMap((item) => item.tags))].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function resolveSpacesPageMode(input: {
  loading: boolean;
  error: boolean;
  spaceCount: number;
  visibleCount: number;
  ungroupedCount: number;
  hasFilters: boolean;
}): SpacesPageMode {
  if (input.loading) {
    return 'loading';
  }
  if (input.error) {
    return 'error';
  }
  if (input.spaceCount === 0 && input.ungroupedCount === 0) {
    return 'no-servers';
  }
  if (input.spaceCount === 0) {
    return 'no-spaces';
  }
  if (input.visibleCount === 0 && input.hasFilters) {
    return 'filtered-empty';
  }
  return 'workspace';
}

