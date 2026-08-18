import { EVENT_TYPES } from '@linuxpilot/server-contracts';

export const AUDIT_PERIODS = ['24h', '7d', '30d', ''] as const;
export type AuditPeriod = (typeof AUDIT_PERIODS)[number];

export type AuditQueryState = {
  q: string;
  actorId: string;
  action: string;
  serverId: string;
  result: string;
  period: AuditPeriod;
  page: number;
  pageSize: number;
  eventId: string;
  refresh: number;
};

export const defaultAuditQuery: AuditQueryState = {
  q: '',
  actorId: '',
  action: '',
  serverId: '',
  result: '',
  period: '',
  page: 1,
  pageSize: 25,
  eventId: '',
  refresh: 30,
};

export const AUDIT_ACTIONS = Object.values(EVENT_TYPES);

export function periodToRange(period: AuditPeriod, now = Date.now()) {
  if (!period) {
    return { from: '', to: '' };
  }
  const ms =
    period === '24h' ? 24 * 60 * 60 * 1000 : period === '7d' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  return { from: new Date(now - ms).toISOString(), to: new Date(now).toISOString() };
}

export function parseAuditQuery(params: URLSearchParams): AuditQueryState {
  const period = params.get('period') ?? '';
  const page = Number(params.get('page'));
  const pageSize = Number(params.get('pageSize'));
  const refresh = Number(params.get('refresh'));
  return {
    q: (params.get('q') ?? '').slice(0, 100),
    actorId: params.get('actor') ?? '',
    action: params.get('action') ?? '',
    serverId: params.get('serverId') ?? '',
    result: params.get('result') ?? '',
    period: AUDIT_PERIODS.includes(period as AuditPeriod) ? (period as AuditPeriod) : '',
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: pageSize === 50 || pageSize === 100 ? pageSize : 25,
    eventId: params.get('eventId') ?? '',
    refresh: refresh === 0 || refresh === 15 || refresh === 60 ? refresh : 30,
  };
}

export function serializeAuditQuery(state: AuditQueryState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q.trim()) params.set('q', state.q.trim());
  if (state.actorId) params.set('actor', state.actorId);
  if (state.action) params.set('action', state.action);
  if (state.serverId) params.set('serverId', state.serverId);
  if (state.result) params.set('result', state.result);
  if (state.period) params.set('period', state.period);
  if (state.page !== 1) params.set('page', String(state.page));
  if (state.pageSize !== 25) params.set('pageSize', String(state.pageSize));
  if (state.eventId) params.set('eventId', state.eventId);
  if (state.refresh !== 30) params.set('refresh', String(state.refresh));
  return params;
}
