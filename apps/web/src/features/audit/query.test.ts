import { describe, expect, it } from 'vitest';
import { parseAuditQuery, serializeAuditQuery } from './query';

describe('audit query', () => {
  it('parses and serializes URL state', () => {
    const params = new URLSearchParams('action=AGENT_REVOKED&period=7d&eventId=e1');
    const state = parseAuditQuery(params);
    expect(state.action).toBe('AGENT_REVOKED');
    expect(state.period).toBe('7d');
    expect(state.eventId).toBe('e1');
    expect(serializeAuditQuery(state).get('action')).toBe('AGENT_REVOKED');
  });

  it('falls back to defaults for invalid values', () => {
    const state = parseAuditQuery(new URLSearchParams('period=nope&page=-2'));
    expect(state.period).toBe('');
    expect(state.page).toBe(1);
  });
});
