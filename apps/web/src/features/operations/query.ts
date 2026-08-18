import {
  OPERATION_STATUSES,
  OPERATION_TYPES,
  type OperationStatus,
  type OperationType,
} from '@linuxpilot/server-contracts';

export const OPERATION_PERIODS = ['24h', '7d', '30d', ''] as const;
export type OperationPeriod = (typeof OPERATION_PERIODS)[number];

export const OPERATION_SORTS = ['created', 'status'] as const;
export type OperationSort = (typeof OPERATION_SORTS)[number];

export const OPERATION_SUMMARY = ['queued', 'running', 'completed', 'errors'] as const;
export type OperationSummary = (typeof OPERATION_SUMMARY)[number];

export type OperationsQueryState = {
  q: string;
  serverId: string;
  type: OperationType | '';
  status: OperationStatus | '';
  requestedBy: string;
  period: OperationPeriod;
  sort: OperationSort;
  page: number;
  pageSize: number;
  operationId: string;
  refresh: number;
};

export const defaultOperationsQuery: OperationsQueryState = {
  q: '',
  serverId: '',
  type: '',
  status: '',
  requestedBy: '',
  period: '',
  sort: 'created',
  page: 1,
  pageSize: 25,
  operationId: '',
  refresh: 30,
};

export function periodToRange(period: OperationPeriod, now = Date.now()) {
  if (!period) {
    return { from: '', to: '' };
  }
  const ms =
    period === '24h' ? 24 * 60 * 60 * 1000 : period === '7d' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  return { from: new Date(now - ms).toISOString(), to: new Date(now).toISOString() };
}

export function parseOperationsQuery(params: URLSearchParams): OperationsQueryState {
  const type = (params.get('type') ?? '').toUpperCase();
  const status = (params.get('status') ?? '').toUpperCase();
  const period = params.get('period') ?? '';
  const sort = params.get('sort') ?? '';
  const page = Number(params.get('page'));
  const pageSize = Number(params.get('pageSize'));
  const refresh = Number(params.get('refresh'));
  return {
    q: (params.get('q') ?? '').slice(0, 100),
    serverId: params.get('serverId') ?? '',
    type: isType(type) ? type : '',
    status: isStatus(status) ? status : '',
    requestedBy: params.get('requestedBy') ?? '',
    period: isPeriod(period) ? period : '',
    sort: isSort(sort) ? sort : defaultOperationsQuery.sort,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: pageSize === 50 || pageSize === 100 ? pageSize : 25,
    operationId: params.get('operationId') ?? '',
    refresh: refresh === 0 || refresh === 15 || refresh === 60 ? refresh : 30,
  };
}

export function serializeOperationsQuery(state: OperationsQueryState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q.trim()) params.set('q', state.q.trim());
  if (state.serverId) params.set('serverId', state.serverId);
  if (state.type) params.set('type', state.type);
  if (state.status) params.set('status', state.status);
  if (state.requestedBy) params.set('requestedBy', state.requestedBy);
  if (state.period) params.set('period', state.period);
  if (state.sort !== defaultOperationsQuery.sort) params.set('sort', state.sort);
  if (state.page !== 1) params.set('page', String(state.page));
  if (state.pageSize !== 25) params.set('pageSize', String(state.pageSize));
  if (state.operationId) params.set('operationId', state.operationId);
  if (state.refresh !== 30) params.set('refresh', String(state.refresh));
  return params;
}

function isType(value: string): value is OperationType {
  return Object.values(OPERATION_TYPES).includes(value as OperationType);
}

function isStatus(value: string): value is OperationStatus {
  return Object.values(OPERATION_STATUSES).includes(value as OperationStatus);
}

function isPeriod(value: string): value is OperationPeriod {
  return OPERATION_PERIODS.includes(value as OperationPeriod);
}

function isSort(value: string): value is OperationSort {
  return OPERATION_SORTS.includes(value as OperationSort);
}
