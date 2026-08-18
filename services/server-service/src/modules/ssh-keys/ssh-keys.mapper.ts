import {
  SSH_KEY_ACTIVITY_TYPES,
  SSH_KEY_ALGORITHMS,
  SSH_KEY_STATUSES,
  SSH_KEY_TYPES,
  SSH_KEY_USAGE_KINDS,
  type SshKey,
  type SshKeyActivity,
  type SshKeyActivityType,
  type SshKeyAlgorithm,
  type SshKeyDetail,
  type SshKeyStatus,
  type SshKeyType,
  type SshKeyUsageCounts,
  type SshKeyUsageItem,
  type SshKeyUsageKind,
} from '@linuxpilot/server-contracts';
import {
  type SshKey as SshKeyRow,
  type SshKeyActivity as SshKeyActivityRow,
  type SshKeyUsage as SshKeyUsageRow,
  SshKeyActivityType as DbActivity,
  SshKeyAlgorithm as DbAlgorithm,
  SshKeyStatus as DbStatus,
  SshKeyType as DbType,
  SshKeyUsageKind as DbUsageKind,
} from '../../generated/prisma-client';

export type SshKeyWithRelations = SshKeyRow & {
  usages: SshKeyUsageRow[];
  activities?: SshKeyActivityRow[];
  _count?: { servers: number };
};

export function toSshKey(row: SshKeyWithRelations, now = Date.now()): SshKey {
  const usage = toUsageCounts(row.usages);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: fromDbType(row.type),
    algorithm: fromDbAlgorithm(row.algorithm),
    keySize: row.keySize,
    fingerprint: row.fingerprint,
    publicKey: row.publicKey,
    status: resolveStatus(row, usage, now),
    tags: row.tags,
    source: row.source,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    rotatedAt: row.rotatedAt?.toISOString() ?? null,
    rotationDueAt: row.rotationDueAt?.toISOString() ?? null,
    version: row.version,
    usage,
  };
}

export function toSshKeyDetail(row: SshKeyWithRelations, now = Date.now()): SshKeyDetail {
  return {
    ...toSshKey(row, now),
    privateKeyProtected: true,
    usages: row.usages.map(toUsageItem),
    activities: (row.activities ?? []).map(toActivity),
  };
}

export function toUsageCounts(usages: SshKeyUsageRow[]): SshKeyUsageCounts {
  const counts: SshKeyUsageCounts = {
    servers: 0,
    spaces: 0,
    templates: 0,
    bastions: 0,
    operations: 0,
  };
  for (const usage of usages) {
    if (usage.kind === DbUsageKind.SERVER) {
      counts.servers += 1;
    } else if (usage.kind === DbUsageKind.SPACE) {
      counts.spaces += 1;
    } else if (usage.kind === DbUsageKind.TEMPLATE) {
      counts.templates += 1;
    } else if (usage.kind === DbUsageKind.BASTION) {
      counts.bastions += 1;
    } else if (usage.kind === DbUsageKind.OPERATION) {
      counts.operations += 1;
    }
  }
  return counts;
}

export function toUsageItem(row: SshKeyUsageRow): SshKeyUsageItem {
  return {
    kind: fromDbUsage(row.kind),
    targetId: row.targetId,
    label: row.label,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toActivity(row: SshKeyActivityRow): SshKeyActivity {
  const metadata =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, string | number | boolean>)
      : {};
  return {
    id: row.id,
    type: fromDbActivity(row.type),
    actorId: row.actorId,
    createdAt: row.createdAt.toISOString(),
    metadata,
  };
}

export function resolveStatus(
  row: Pick<SshKeyRow, 'status' | 'rotationDueAt'>,
  usage: SshKeyUsageCounts,
  now = Date.now(),
): SshKeyStatus {
  if (
    row.status === DbStatus.DISABLED ||
    row.status === DbStatus.COMPROMISED ||
    row.status === DbStatus.EXPIRED ||
    row.status === DbStatus.DELETING ||
    row.status === DbStatus.ROTATION_REQUIRED
  ) {
    return fromDbStatus(row.status);
  }
  if (row.rotationDueAt && row.rotationDueAt.getTime() <= now) {
    return SSH_KEY_STATUSES.ROTATION_REQUIRED;
  }
  if (usage.servers + usage.spaces + usage.templates + usage.bastions === 0) {
    return SSH_KEY_STATUSES.UNUSED;
  }
  return SSH_KEY_STATUSES.ACTIVE;
}

export function toDbType(value: SshKeyType): DbType {
  switch (value) {
    case SSH_KEY_TYPES.PUBLIC_KEY:
      return DbType.PUBLIC_KEY;
    case SSH_KEY_TYPES.GENERATED_KEYPAIR:
      return DbType.GENERATED_KEYPAIR;
    case SSH_KEY_TYPES.SSH_AGENT:
      return DbType.SSH_AGENT;
    case SSH_KEY_TYPES.EXTERNAL_PROVIDER:
      return DbType.EXTERNAL_PROVIDER;
    default:
      return DbType.PRIVATE_KEY;
  }
}

export function toDbAlgorithm(value: SshKeyAlgorithm): DbAlgorithm {
  if (value === SSH_KEY_ALGORITHMS.RSA) {
    return DbAlgorithm.RSA;
  }
  if (value === SSH_KEY_ALGORITHMS.ECDSA) {
    return DbAlgorithm.ECDSA;
  }
  return DbAlgorithm.ED25519;
}

export function toDbStatus(value: SshKeyStatus): DbStatus {
  switch (value) {
    case SSH_KEY_STATUSES.ACTIVE:
      return DbStatus.ACTIVE;
    case SSH_KEY_STATUSES.ROTATION_REQUIRED:
      return DbStatus.ROTATION_REQUIRED;
    case SSH_KEY_STATUSES.EXPIRED:
      return DbStatus.EXPIRED;
    case SSH_KEY_STATUSES.DISABLED:
      return DbStatus.DISABLED;
    case SSH_KEY_STATUSES.COMPROMISED:
      return DbStatus.COMPROMISED;
    case SSH_KEY_STATUSES.DELETING:
      return DbStatus.DELETING;
    default:
      return DbStatus.UNUSED;
  }
}

function fromDbType(value: DbType): SshKeyType {
  switch (value) {
    case DbType.PUBLIC_KEY:
      return SSH_KEY_TYPES.PUBLIC_KEY;
    case DbType.GENERATED_KEYPAIR:
      return SSH_KEY_TYPES.GENERATED_KEYPAIR;
    case DbType.SSH_AGENT:
      return SSH_KEY_TYPES.SSH_AGENT;
    case DbType.EXTERNAL_PROVIDER:
      return SSH_KEY_TYPES.EXTERNAL_PROVIDER;
    default:
      return SSH_KEY_TYPES.PRIVATE_KEY;
  }
}

function fromDbAlgorithm(value: DbAlgorithm): SshKeyAlgorithm {
  if (value === DbAlgorithm.RSA) {
    return SSH_KEY_ALGORITHMS.RSA;
  }
  if (value === DbAlgorithm.ECDSA) {
    return SSH_KEY_ALGORITHMS.ECDSA;
  }
  return SSH_KEY_ALGORITHMS.ED25519;
}

function fromDbStatus(value: DbStatus): SshKeyStatus {
  switch (value) {
    case DbStatus.ACTIVE:
      return SSH_KEY_STATUSES.ACTIVE;
    case DbStatus.ROTATION_REQUIRED:
      return SSH_KEY_STATUSES.ROTATION_REQUIRED;
    case DbStatus.EXPIRED:
      return SSH_KEY_STATUSES.EXPIRED;
    case DbStatus.DISABLED:
      return SSH_KEY_STATUSES.DISABLED;
    case DbStatus.COMPROMISED:
      return SSH_KEY_STATUSES.COMPROMISED;
    case DbStatus.DELETING:
      return SSH_KEY_STATUSES.DELETING;
    default:
      return SSH_KEY_STATUSES.UNUSED;
  }
}

function fromDbUsage(value: DbUsageKind): SshKeyUsageKind {
  switch (value) {
    case DbUsageKind.SPACE:
      return SSH_KEY_USAGE_KINDS.SPACE;
    case DbUsageKind.TEMPLATE:
      return SSH_KEY_USAGE_KINDS.TEMPLATE;
    case DbUsageKind.BASTION:
      return SSH_KEY_USAGE_KINDS.BASTION;
    case DbUsageKind.OPERATION:
      return SSH_KEY_USAGE_KINDS.OPERATION;
    default:
      return SSH_KEY_USAGE_KINDS.SERVER;
  }
}

function fromDbActivity(value: DbActivity): SshKeyActivityType {
  switch (value) {
    case DbActivity.IMPORTED:
      return SSH_KEY_ACTIVITY_TYPES.IMPORTED;
    case DbActivity.ASSIGNED:
      return SSH_KEY_ACTIVITY_TYPES.ASSIGNED;
    case DbActivity.USED:
      return SSH_KEY_ACTIVITY_TYPES.USED;
    case DbActivity.UPDATED:
      return SSH_KEY_ACTIVITY_TYPES.UPDATED;
    case DbActivity.ROTATED:
      return SSH_KEY_ACTIVITY_TYPES.ROTATED;
    case DbActivity.DISABLED:
      return SSH_KEY_ACTIVITY_TYPES.DISABLED;
    case DbActivity.DELETED:
      return SSH_KEY_ACTIVITY_TYPES.DELETED;
    case DbActivity.INSTALLED:
      return SSH_KEY_ACTIVITY_TYPES.INSTALLED;
    default:
      return SSH_KEY_ACTIVITY_TYPES.CREATED;
  }
}

export function isUsableStatus(status: SshKeyStatus): boolean {
  return status === SSH_KEY_STATUSES.ACTIVE || status === SSH_KEY_STATUSES.UNUSED;
}
