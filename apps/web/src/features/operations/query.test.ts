import { describe, expect, it } from 'vitest';
import { parseOperationsQuery, serializeOperationsQuery } from './query';

describe('operations query', () => {
  it('parses and serializes URL state', () => {
    const params = new URLSearchParams(
      'status=FAILED&serverId=s1&period=7d&operationId=op1&q=reboot',
    );
    const state = parseOperationsQuery(params);
    expect(state.status).toBe('FAILED');
    expect(state.serverId).toBe('s1');
    expect(state.period).toBe('7d');
    expect(state.operationId).toBe('op1');
    expect(serializeOperationsQuery(state).get('status')).toBe('FAILED');
  });

  it('falls back to defaults for invalid values', () => {
    const state = parseOperationsQuery(new URLSearchParams('status=nope&page=-1'));
    expect(state.status).toBe('');
    expect(state.page).toBe(1);
  });
});
