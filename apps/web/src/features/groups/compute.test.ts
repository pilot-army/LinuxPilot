import { describe, expect, it } from 'vitest';
import type { ServerGroup } from '@linuxpilot/server-contracts';
import { filterAndSortGroups, matchesGroupQuery, resolveSpacesPageMode } from './compute';

function group(partial: Partial<ServerGroup>): ServerGroup {
  return {
    id: '1',
    name: 'Production',
    description: 'Main production environment',
    color: '#3b82f6',
    tags: ['critical', 'prod'],
    notificationsEnabled: true,
    version: 1,
    createdAt: '2026-08-16T08:00:00.000Z',
    updatedAt: '2026-08-16T09:00:00.000Z',
    serverCount: 5,
    onlineCount: 4,
    offlineCount: 0,
    warningCount: 1,
    withoutAgentCount: 0,
    averageCpuPercent: 42,
    averageMemoryPercent: 58,
    averageDiskPercent: null,
    memberNames: ['web-01', 'database-01'],
    ...partial,
  };
}

describe('group compute', () => {
  it('searches name, description, tags, and member names', () => {
    const item = group({});
    expect(matchesGroupQuery(item, { q: 'prod', filter: 'all' })).toBe(true);
    expect(matchesGroupQuery(item, { q: 'database-01', filter: 'all' })).toBe(true);
    expect(matchesGroupQuery(item, { q: 'missing', filter: 'all' })).toBe(false);
  });

  it('filters by status and empty groups', () => {
    expect(matchesGroupQuery(group({ warningCount: 1 }), { q: '', filter: 'warning' })).toBe(true);
    expect(matchesGroupQuery(group({ serverCount: 0 }), { q: '', filter: 'empty' })).toBe(true);
    expect(matchesGroupQuery(group({ serverCount: 2 }), { q: '', filter: 'empty' })).toBe(false);
  });

  it('filters by tag', () => {
    expect(matchesGroupQuery(group({ tags: ['prod'] }), { q: '', filter: 'all', tag: 'prod' })).toBe(
      true,
    );
    expect(
      matchesGroupQuery(group({ tags: ['staging'] }), { q: '', filter: 'all', tag: 'prod' }),
    ).toBe(false);
  });

  it('sorts by server count and status', () => {
    const items = [
      group({ id: 'a', name: 'A', serverCount: 1, offlineCount: 1 }),
      group({
        id: 'b',
        name: 'B',
        serverCount: 4,
        offlineCount: 0,
        warningCount: 0,
        onlineCount: 4,
      }),
    ];
    expect(filterAndSortGroups(items, { q: '', filter: 'all', sort: 'servers' })[0]?.id).toBe('b');
    expect(filterAndSortGroups(items, { q: '', filter: 'all', sort: 'status' })[0]?.id).toBe('a');
  });

  it('resolves page modes without mixing empty states', () => {
    expect(
      resolveSpacesPageMode({
        loading: true,
        error: false,
        spaceCount: 0,
        visibleCount: 0,
        ungroupedCount: 0,
        hasFilters: false,
      }),
    ).toBe('loading');
    expect(
      resolveSpacesPageMode({
        loading: false,
        error: true,
        spaceCount: 0,
        visibleCount: 0,
        ungroupedCount: 0,
        hasFilters: false,
      }),
    ).toBe('error');
    expect(
      resolveSpacesPageMode({
        loading: false,
        error: false,
        spaceCount: 0,
        visibleCount: 0,
        ungroupedCount: 0,
        hasFilters: false,
      }),
    ).toBe('no-servers');
    expect(
      resolveSpacesPageMode({
        loading: false,
        error: false,
        spaceCount: 0,
        visibleCount: 0,
        ungroupedCount: 3,
        hasFilters: false,
      }),
    ).toBe('no-spaces');
    expect(
      resolveSpacesPageMode({
        loading: false,
        error: false,
        spaceCount: 2,
        visibleCount: 0,
        ungroupedCount: 1,
        hasFilters: true,
      }),
    ).toBe('filtered-empty');
    expect(
      resolveSpacesPageMode({
        loading: false,
        error: false,
        spaceCount: 2,
        visibleCount: 2,
        ungroupedCount: 1,
        hasFilters: false,
      }),
    ).toBe('workspace');
  });
});
