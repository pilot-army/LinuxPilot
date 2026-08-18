import { describe, expect, it } from 'vitest';
import { parseGroupsQuery, serializeGroupsQuery } from './query';

describe('groups query', () => {
  it('parses and serializes URL state without spaceId', () => {
    const params = new URLSearchParams('q=prod&status=warning&sort=servers&layout=list&refresh=15');
    const state = parseGroupsQuery(params);
    expect(state.q).toBe('prod');
    expect(state.filter).toBe('warning');
    expect(state.sort).toBe('servers');
    expect(state.layout).toBe('list');
    expect(state.refresh).toBe(15);
    const serialized = serializeGroupsQuery(state);
    expect(serialized.get('q')).toBe('prod');
    expect(serialized.get('status')).toBe('warning');
    expect(serialized.get('layout')).toBe('list');
    expect(serialized.get('spaceId')).toBeNull();
    expect(serialized.get('refresh')).toBe('15');
  });

  it('ignores leftover spaceId query parameters', () => {
    const state = parseGroupsQuery(new URLSearchParams('spaceId=g1&q=prod'));
    expect(state.q).toBe('prod');
    expect(serializeGroupsQuery(state).get('spaceId')).toBeNull();
  });

  it('does not serialize refresh=0', () => {
    const serialized = serializeGroupsQuery({
      ...parseGroupsQuery(new URLSearchParams()),
      refresh: 0,
    });
    expect(serialized.get('refresh')).toBeNull();
  });

  it('falls back to defaults for invalid values', () => {
    const state = parseGroupsQuery(new URLSearchParams('status=nope&sort=x&refresh=7'));
    expect(state.filter).toBe('all');
    expect(state.sort).toBe('name');
    expect(state.refresh).toBe(30);
  });
});
