import type {
  SshKey,
  SshKeyAlgorithm,
  SshKeySortField,
  SshKeyStatus,
  SshKeyType,
  SshKeyUsageFilter,
} from '@linuxpilot/server-contracts';

export const SSH_KEY_PAGE_REFRESH = [0, 30, 60] as const;

export type SshKeysQueryState = {
  q: string;
  type: SshKeyType | '';
  algorithm: SshKeyAlgorithm | '';
  status: SshKeyStatus | '';
  usage: SshKeyUsageFilter;
  sort: SshKeySortField;
  keyId: string;
  refresh: number;
};

export type SshKeysListState = {
  items: SshKey[];
  total: number;
  summary: {
    total: number;
    used: number;
    unused: number;
    attention: number;
    rotationDue: number;
    passwordAuthServers: number;
  };
  status: 'loading' | 'refreshing' | 'success' | 'empty' | 'error';
  error: 'network' | 'forbidden' | 'generic' | null;
  lastSuccessfulAt: string | null;
};

export type SshKeyDialog =
  | 'import'
  | 'public'
  | 'generate'
  | 'install'
  | 'rotate'
  | 'delete'
  | 'edit'
  | null;
