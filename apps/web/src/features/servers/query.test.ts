import { describe, expect, it } from 'vitest';
import { SERVER_STATUSES } from '@linuxpilot/server-contracts';
import {
  apiStatusForQuery,
  hasActiveServersFilters,
  parseServersQuery,
  serializeServersQuery,
  viewToStatus,
} from './query';

describe('servers query', () => {
  it('parses and serializes URL state', () => {
    const params = new URLSearchParams(
      'view=online&q=prod&sort=name&order=asc&page=2&pageSize=50&server=abc&groupId=g1&layout=grid&refresh=15',
    );
    const state = parseServersQuery(params);
    expect(state.view).toBe('online');
    expect(state.q).toBe('prod');
    expect(state.sort).toBe('name');
    expect(state.page).toBe(2);
    expect(state.pageSize).toBe(50);
    expect(state.serverId).toBe('abc');
    expect(state.spaceId).toBe('g1');
    expect(state.layout).toBe('grid');
    expect(state.refresh).toBe(15);
    expect(serializeServersQuery(state).get('view')).toBe('online');
    expect(serializeServersQuery(state).get('q')).toBe('prod');
    expect(serializeServersQuery(state).get('spaceId')).toBe('g1');
    expect(parseServersQuery(new URLSearchParams('spaceId=abc')).spaceId).toBe('abc');
    expect(state.agent).toBe('all');
    expect(hasActiveServersFilters(state)).toBe(true);
    expect(hasActiveServersFilters(parseServersQuery(new URLSearchParams()))).toBe(false);
    expect(
      serializeServersQuery({
        ...parseServersQuery(new URLSearchParams()),
        agent: 'missing',
      }).get('agent'),
    ).toBe('missing');
    expect(
      serializeServersQuery(parseServersQuery(new URLSearchParams('env=staging'))).get('env'),
    ).toBeNull();
  });

  it('falls back to defaults for invalid values', () => {
    const state = parseServersQuery(new URLSearchParams('view=nope&page=-1&refresh=7'));
    expect(state.view).toBe('all');
    expect(state.page).toBe(1);
    expect(state.refresh).toBe(30);
  });

  it('maps views to real API statuses', () => {
    expect(viewToStatus('online')).toBe(SERVER_STATUSES.ONLINE);
    expect(viewToStatus('offline')).toBe(SERVER_STATUSES.OFFLINE);
    expect(viewToStatus('noAgent')).toBe(SERVER_STATUSES.PENDING);
    expect(viewToStatus('all')).toBe('');
    expect(
      apiStatusForQuery({
        ...parseServersQuery(new URLSearchParams()),
        view: 'all',
        status: SERVER_STATUSES.DEGRADED,
      }),
    ).toBe(SERVER_STATUSES.DEGRADED);
  });
});
