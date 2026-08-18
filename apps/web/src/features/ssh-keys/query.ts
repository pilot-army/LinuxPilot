import {
  SSH_KEY_ALGORITHMS,
  SSH_KEY_SORT_FIELDS,
  SSH_KEY_STATUSES,
  SSH_KEY_TYPES,
  SSH_KEY_USAGE_FILTERS,
  type SshKeyAlgorithm,
  type SshKeySortField,
  type SshKeyStatus,
  type SshKeyType,
  type SshKeyUsageFilter,
} from '@linuxpilot/server-contracts';
import type { SshKeysQueryState } from './types';

export const defaultSshKeysQuery: SshKeysQueryState = {
  q: '',
  type: '',
  algorithm: '',
  status: '',
  usage: 'all',
  sort: 'createdAt',
  keyId: '',
  refresh: 30,
};

export function parseSshKeysQuery(params: URLSearchParams): SshKeysQueryState {
  const type = params.get('type');
  const algorithm = params.get('algorithm');
  const status = params.get('status');
  const usage = params.get('usage');
  const sort = params.get('sort');
  const refresh = Number(params.get('refresh'));

  return {
    q: (params.get('q') ?? '').slice(0, 200),
    type: isType(type) ? type : '',
    algorithm: isAlgorithm(algorithm) ? algorithm : '',
    status: isStatus(status) ? status : '',
    usage: isUsage(usage) ? usage : defaultSshKeysQuery.usage,
    sort: isSort(sort) ? sort : defaultSshKeysQuery.sort,
    keyId: params.get('keyId') ?? '',
    refresh: [0, 30, 60].includes(refresh) ? refresh : defaultSshKeysQuery.refresh,
  };
}

export function serializeSshKeysQuery(state: SshKeysQueryState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q.trim()) {
    params.set('q', state.q.trim());
  }
  if (state.type) {
    params.set('type', state.type);
  }
  if (state.algorithm) {
    params.set('algorithm', state.algorithm);
  }
  if (state.status) {
    params.set('status', state.status);
  }
  if (state.usage !== defaultSshKeysQuery.usage) {
    params.set('usage', state.usage);
  }
  if (state.sort !== defaultSshKeysQuery.sort) {
    params.set('sort', state.sort);
  }
  if (state.keyId) {
    params.set('keyId', state.keyId);
  }
  if (state.refresh !== defaultSshKeysQuery.refresh) {
    params.set('refresh', String(state.refresh));
  }
  return params;
}

export function toListParams(state: SshKeysQueryState): URLSearchParams {
  const params = serializeSshKeysQuery(state);
  params.delete('keyId');
  params.delete('refresh');
  return params;
}

function isType(value: string | null): value is SshKeyType {
  return Object.values(SSH_KEY_TYPES).includes(value as SshKeyType);
}

function isAlgorithm(value: string | null): value is SshKeyAlgorithm {
  return Object.values(SSH_KEY_ALGORITHMS).includes(value as SshKeyAlgorithm);
}

function isStatus(value: string | null): value is SshKeyStatus {
  return Object.values(SSH_KEY_STATUSES).includes(value as SshKeyStatus);
}

function isUsage(value: string | null): value is SshKeyUsageFilter {
  return SSH_KEY_USAGE_FILTERS.includes(value as SshKeyUsageFilter);
}

function isSort(value: string | null): value is SshKeySortField {
  return SSH_KEY_SORT_FIELDS.includes(value as SshKeySortField);
}
