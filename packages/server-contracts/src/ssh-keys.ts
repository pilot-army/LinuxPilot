import { z } from 'zod';
import { SERVER_TAG_PATTERN, MAX_SERVER_TAGS, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE } from './servers';

export const SSH_KEY_TYPES = {
  PRIVATE_KEY: 'private_key',
  PUBLIC_KEY: 'public_key',
  GENERATED_KEYPAIR: 'generated_keypair',
  SSH_AGENT: 'ssh_agent',
  EXTERNAL_PROVIDER: 'external_provider',
} as const;

export type SshKeyType = (typeof SSH_KEY_TYPES)[keyof typeof SSH_KEY_TYPES];

export const SSH_KEY_ALGORITHMS = {
  ED25519: 'ed25519',
  RSA: 'rsa',
  ECDSA: 'ecdsa',
} as const;

export type SshKeyAlgorithm = (typeof SSH_KEY_ALGORITHMS)[keyof typeof SSH_KEY_ALGORITHMS];

export const SSH_KEY_STATUSES = {
  ACTIVE: 'active',
  UNUSED: 'unused',
  ROTATION_REQUIRED: 'rotation_required',
  EXPIRED: 'expired',
  DISABLED: 'disabled',
  COMPROMISED: 'compromised',
  DELETING: 'deleting',
} as const;

export type SshKeyStatus = (typeof SSH_KEY_STATUSES)[keyof typeof SSH_KEY_STATUSES];

export const SSH_KEY_USAGE_KINDS = {
  SERVER: 'server',
  SPACE: 'space',
  TEMPLATE: 'template',
  BASTION: 'bastion',
  OPERATION: 'operation',
} as const;

export type SshKeyUsageKind = (typeof SSH_KEY_USAGE_KINDS)[keyof typeof SSH_KEY_USAGE_KINDS];

export const SSH_KEY_ACTIVITY_TYPES = {
  CREATED: 'created',
  IMPORTED: 'imported',
  ASSIGNED: 'assigned',
  USED: 'used',
  UPDATED: 'updated',
  ROTATED: 'rotated',
  DISABLED: 'disabled',
  DELETED: 'deleted',
  INSTALLED: 'installed',
} as const;

export type SshKeyActivityType =
  (typeof SSH_KEY_ACTIVITY_TYPES)[keyof typeof SSH_KEY_ACTIVITY_TYPES];

export const SSH_KEY_SORT_FIELDS = [
  'name',
  'createdAt',
  'lastUsedAt',
  'serverCount',
  'rotatedAt',
] as const;

export type SshKeySortField = (typeof SSH_KEY_SORT_FIELDS)[number];

export const SSH_KEY_USAGE_FILTERS = ['all', 'used', 'unused'] as const;
export type SshKeyUsageFilter = (typeof SSH_KEY_USAGE_FILTERS)[number];

export const RSA_MIN_BITS = 3072;
export const RSA_RECOMMENDED_BITS = 4096;

const sshKeyTypeValues = [
  SSH_KEY_TYPES.PRIVATE_KEY,
  SSH_KEY_TYPES.PUBLIC_KEY,
  SSH_KEY_TYPES.GENERATED_KEYPAIR,
  SSH_KEY_TYPES.SSH_AGENT,
  SSH_KEY_TYPES.EXTERNAL_PROVIDER,
] as const;

const sshKeyAlgorithmValues = [
  SSH_KEY_ALGORITHMS.ED25519,
  SSH_KEY_ALGORITHMS.RSA,
  SSH_KEY_ALGORITHMS.ECDSA,
] as const;

const sshKeyStatusValues = [
  SSH_KEY_STATUSES.ACTIVE,
  SSH_KEY_STATUSES.UNUSED,
  SSH_KEY_STATUSES.ROTATION_REQUIRED,
  SSH_KEY_STATUSES.EXPIRED,
  SSH_KEY_STATUSES.DISABLED,
  SSH_KEY_STATUSES.COMPROMISED,
  SSH_KEY_STATUSES.DELETING,
] as const;

const nameSchema = z.string().trim().min(1).max(80);
const descriptionSchema = z.string().trim().max(500);
const tagsSchema = z.array(z.string().trim().regex(SERVER_TAG_PATTERN)).max(MAX_SERVER_TAGS);
const commentSchema = z.string().trim().max(120);

export const inspectSshKeySchema = z
  .object({
    privateKey: z.string().min(1).max(16_384).optional(),
    publicKey: z.string().min(1).max(8_192).optional(),
    passphrase: z.string().max(512).optional(),
  })
  .refine((value) => Boolean(value.privateKey || value.publicKey), {
    message: 'A public or private key is required',
  });

export type InspectSshKeyRequest = z.infer<typeof inspectSshKeySchema>;

export const importPrivateSshKeySchema = z.object({
  name: nameSchema,
  description: descriptionSchema.optional().default(''),
  privateKey: z.string().min(32).max(16_384),
  passphrase: z.string().max(512).optional(),
  tags: tagsSchema.optional().default([]),
});

export type ImportPrivateSshKeyRequest = z.input<typeof importPrivateSshKeySchema>;

export const addPublicSshKeySchema = z.object({
  name: nameSchema,
  description: descriptionSchema.optional().default(''),
  publicKey: z.string().min(32).max(8_192),
  tags: tagsSchema.optional().default([]),
});

export type AddPublicSshKeyRequest = z.input<typeof addPublicSshKeySchema>;

export const generateSshKeySchema = z.object({
  name: nameSchema,
  description: descriptionSchema.optional().default(''),
  algorithm: z.enum(sshKeyAlgorithmValues).default(SSH_KEY_ALGORITHMS.ED25519),
  rsaBits: z.union([z.literal(3072), z.literal(4096)]).optional(),
  comment: commentSchema.optional(),
  tags: tagsSchema.optional().default([]),
});

export type GenerateSshKeyRequest = z.input<typeof generateSshKeySchema>;

export const updateSshKeySchema = z
  .object({
    name: nameSchema.optional(),
    description: descriptionSchema.optional(),
    tags: tagsSchema.optional(),
    status: z
      .enum([
        SSH_KEY_STATUSES.ACTIVE,
        SSH_KEY_STATUSES.UNUSED,
        SSH_KEY_STATUSES.ROTATION_REQUIRED,
        SSH_KEY_STATUSES.DISABLED,
        SSH_KEY_STATUSES.COMPROMISED,
      ])
      .optional(),
    version: z.number().int().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

export type UpdateSshKeyRequest = z.infer<typeof updateSshKeySchema>;

const listSshKeysQueryObject = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  sort: z.enum(SSH_KEY_SORT_FIELDS).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  q: z.string().trim().max(200).optional(),
  type: z.enum(sshKeyTypeValues).optional(),
  algorithm: z.enum(sshKeyAlgorithmValues).optional(),
  status: z.enum(sshKeyStatusValues).optional(),
  usage: z.enum(SSH_KEY_USAGE_FILTERS).default('all'),
  usable: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true' || value === '1')),
});

export const listSshKeysQuerySchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== 'object') {
    return raw;
  }
  const value = { ...(raw as Record<string, unknown>) };
  if (typeof value.sort === 'string' && value.sort.includes(':')) {
    const [field, dir] = value.sort.split(':');
    value.sort = field;
    if (value.order === undefined || value.order === '') {
      value.order = dir;
    }
  }
  return value;
}, listSshKeysQueryObject);

export type ListSshKeysQuery = z.infer<typeof listSshKeysQueryObject>;

export const AUTHORIZED_KEYS_DEFAULT = '~/.ssh/authorized_keys';

export const installSshKeySchema = z.object({
  serverIds: z.array(z.string().uuid()).min(1).max(50).optional(),
  spaceId: z.string().uuid().optional(),
  sshUser: z.string().trim().min(1).max(64).default('linuxpilot'),
  authorizedKeysPath: z.string().trim().min(1).max(255).default(AUTHORIZED_KEYS_DEFAULT),
});

export type InstallSshKeyRequest = z.input<typeof installSshKeySchema>;

export const rotateSshKeySchema = z.object({
  replacementKeyId: z.string().uuid(),
  serverIds: z.array(z.string().uuid()).min(1).max(50).optional(),
  sshUser: z.string().trim().min(1).max(64).optional(),
  authorizedKeysPath: z.string().trim().min(1).max(255).default(AUTHORIZED_KEYS_DEFAULT),
});

export type RotateSshKeyRequest = z.input<typeof rotateSshKeySchema>;

export type SshKeyPreview = {
  algorithm: SshKeyAlgorithm;
  fingerprint: string;
  keySize: number | null;
  encrypted: boolean;
  hasPublicKey: boolean;
  ready: boolean;
};

export type SshKeyUsageCounts = {
  servers: number;
  spaces: number;
  templates: number;
  bastions: number;
  operations: number;
};

export type SshKeySummary = {
  total: number;
  used: number;
  unused: number;
  attention: number;
  rotationDue: number;
  passwordAuthServers: number;
};

export type SshKey = {
  id: string;
  name: string;
  description: string;
  type: SshKeyType;
  algorithm: SshKeyAlgorithm;
  keySize: number | null;
  fingerprint: string;
  publicKey: string;
  status: SshKeyStatus;
  tags: string[];
  source: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
  rotatedAt: string | null;
  rotationDueAt: string | null;
  version: number;
  usage: SshKeyUsageCounts;
};

export type SshKeyListResponse = {
  items: SshKey[];
  page: number;
  pageSize: number;
  total: number;
  summary: SshKeySummary;
};

export type SshKeyUsageItem = {
  kind: SshKeyUsageKind;
  targetId: string;
  label: string;
  createdAt: string;
};

export type SshKeyUsagesResponse = {
  items: SshKeyUsageItem[];
  counts: SshKeyUsageCounts;
};

export type SshKeyActivity = {
  id: string;
  type: SshKeyActivityType;
  actorId: string | null;
  createdAt: string;
  metadata: Record<string, string | number | boolean>;
};

export type SshKeyDetail = SshKey & {
  activities: SshKeyActivity[];
  usages: SshKeyUsageItem[];
  privateKeyProtected: true;
};

export type SshKeyServerResult = {
  serverId: string;
  name: string;
  success: boolean;
  status: 'assigned' | 'rotated' | 'unchanged' | 'failed';
  authorizedKeysPath?: string;
  errorCode?: string;
};

export type SshKeyMutationResponse = {
  key: SshKey;
  results?: SshKeyServerResult[];
};
