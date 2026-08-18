import { z } from 'zod';
import { AGENT_STATUSES, SERVER_STATUSES, type AgentStatus, type ServerStatus } from './status';

export const SERVER_TAG_PATTERN = /^[a-z0-9][a-z0-9._-]{0,31}$/i;
export const MAX_SERVER_TAGS = 16;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_BULK_SERVERS = 50;
export const GROUP_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;
export const SPACE_COLOR_PATTERN = GROUP_COLOR_PATTERN;

function aliasSpaceFields(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return raw;
  }
  const value = { ...(raw as Record<string, unknown>) };
  if (value.spaceId === undefined && value.groupId !== undefined) {
    value.spaceId = value.groupId;
  }
  if (value.unassigned === undefined && value.ungrouped !== undefined) {
    value.unassigned = value.ungrouped;
  }
  return value;
}

export const serverSortFields = ['name', 'hostname', 'status', 'lastSeenAt', 'createdAt'] as const;
export type ServerSortField = (typeof serverSortFields)[number];

const serverStatusValues = [
  SERVER_STATUSES.PENDING,
  SERVER_STATUSES.ONLINE,
  SERVER_STATUSES.DEGRADED,
  SERVER_STATUSES.OFFLINE,
  SERVER_STATUSES.REVOKED,
  SERVER_STATUSES.MAINTENANCE,
] as const;

const agentStatusValues = [
  AGENT_STATUSES.CONNECTED,
  AGENT_STATUSES.DISCONNECTED,
  AGENT_STATUSES.NOT_INSTALLED,
  AGENT_STATUSES.REVOKED,
  AGENT_STATUSES.OUTDATED,
] as const;

export const diskMetricSchema = z.object({
  mountPoint: z.string().min(1).max(255),
  filesystem: z.string().min(1).max(64),
  usedBytes: z.number().nonnegative(),
  totalBytes: z.number().positive(),
  usedPercent: z.number().min(0).max(100),
  excluded: z.boolean().optional(),
});

export type DiskMetric = z.infer<typeof diskMetricSchema>;

export const optionalIpSchema = z
  .string()
  .trim()
  .max(45)
  .refine((value) => value.length === 0 || isLooseIp(value), { message: 'Invalid IP address' })
  .optional();

function isLooseIp(value: string): boolean {
  if (
    /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(value)
  ) {
    return true;
  }
  return value.includes(':') && value.length <= 45 && !/[^0-9a-fA-F:]/.test(value);
}

export const SERVER_ARCHITECTURES = ['amd64', 'arm64'] as const;
export type ServerArchitecture = (typeof SERVER_ARCHITECTURES)[number];
export const SYSTEM_INFO_STATUSES = ['pending', 'detected', 'unknown'] as const;
export type SystemInfoStatus = (typeof SYSTEM_INFO_STATUSES)[number];
export const UNKNOWN_SYSTEM_VALUE = 'unknown';

export const createServerSchema = z.preprocess(
  aliasSpaceFields,
  z.object({
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(500).optional().default(''),
    hostname: z.string().trim().max(255).optional(),
    primaryIp: optionalIpSchema,
    spaceId: z.string().uuid().optional().nullable(),
    tags: z
      .array(z.string().trim().regex(SERVER_TAG_PATTERN))
      .max(MAX_SERVER_TAGS)
      .optional()
      .default([]),
    autoDetectSystem: z.boolean().optional().default(true),
    osName: z.string().trim().min(1).max(64).optional().nullable(),
    osVersion: z.string().trim().max(64).optional().nullable(),
    architecture: z.enum(SERVER_ARCHITECTURES).optional().nullable(),
    sshKeyId: z.string().uuid().optional().nullable(),
    sshUser: z.string().trim().min(1).max(64).optional().nullable(),
    sshPort: z.coerce.number().int().min(1).max(65535).optional().nullable(),
  }),
);

export type CreateServerRequest = z.infer<typeof createServerSchema>;

export const updateServerSchema = z.preprocess(
  aliasSpaceFields,
  z
    .object({
      name: z.string().trim().min(1).max(80).optional(),
      description: z.string().trim().max(500).optional(),
      hostname: z.string().trim().max(255).optional().nullable(),
      primaryIp: optionalIpSchema.nullable(),
      spaceId: z.string().uuid().optional().nullable(),
      tags: z.array(z.string().trim().regex(SERVER_TAG_PATTERN)).max(MAX_SERVER_TAGS).optional(),
      version: z.number().int().min(1).optional(),
      autoDetectSystem: z.boolean().optional(),
      osName: z.string().trim().min(1).max(64).optional().nullable(),
      osVersion: z.string().trim().max(64).optional().nullable(),
      architecture: z.enum(SERVER_ARCHITECTURES).optional().nullable(),
      sshKeyId: z.string().uuid().optional().nullable(),
      sshUser: z.string().trim().min(1).max(64).optional().nullable(),
      sshPort: z.coerce.number().int().min(1).max(65535).optional().nullable(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field is required',
    }),
);

export type UpdateServerRequest = z.infer<typeof updateServerSchema>;

const listServersQueryObject = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  sort: z.enum(serverSortFields).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  q: z.string().trim().max(100).optional(),
  search: z.string().trim().max(100).optional(),
  status: z.enum(serverStatusValues).optional(),
  agentStatus: z.enum(agentStatusValues).optional(),
  spaceId: z.string().uuid().optional(),
  unassigned: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true' || value === '1')),
  tag: z.string().trim().max(32).optional(),
  os: z.string().trim().max(64).optional(),
  maintenance: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true' || value === '1')),
});

export const listServersQuerySchema = z.preprocess((raw) => {
  const aliased = aliasSpaceFields(raw);
  if (!aliased || typeof aliased !== 'object') {
    return aliased;
  }
  const value = { ...(aliased as Record<string, unknown>) };
  if (typeof value.search === 'string' && (value.q === undefined || value.q === '')) {
    value.q = value.search;
  }
  if (typeof value.sort === 'string' && value.sort.includes(':')) {
    const [field, dir] = value.sort.split(':');
    value.sort = field;
    if (value.order === undefined || value.order === '') {
      value.order = dir;
    }
  }
  return value;
}, listServersQueryObject);

export type ListServersQuery = z.infer<typeof listServersQueryObject>;

export const metricsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(120),
});

export type MetricsQuery = z.infer<typeof metricsQuerySchema>;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const assignSpaceSchema = z.preprocess(
  aliasSpaceFields,
  z.object({
    spaceId: z.string().uuid().nullable(),
  }),
);

export type AssignSpaceRequest = z.infer<typeof assignSpaceSchema>;
export const assignGroupSchema = assignSpaceSchema;
export type AssignGroupRequest = AssignSpaceRequest;

export const addTagsSchema = z.object({
  tags: z.array(z.string().trim().regex(SERVER_TAG_PATTERN)).min(1).max(MAX_SERVER_TAGS),
});

export type AddTagsRequest = z.infer<typeof addTagsSchema>;

export const bulkIdsSchema = z.object({
  serverIds: z.array(z.string().uuid()).min(1).max(MAX_BULK_SERVERS),
});

export const bulkSpaceSchema = z.preprocess(
  aliasSpaceFields,
  bulkIdsSchema.extend({
    spaceId: z.string().uuid().nullable(),
  }),
);

export type BulkSpaceRequest = z.infer<typeof bulkSpaceSchema>;
export const bulkGroupSchema = bulkSpaceSchema;
export type BulkGroupRequest = BulkSpaceRequest;

export const bulkTagsSchema = bulkIdsSchema.extend({
  tags: z.array(z.string().trim().regex(SERVER_TAG_PATTERN)).min(1).max(MAX_SERVER_TAGS),
  mode: z.enum(['add', 'remove']).default('add'),
});

export type BulkTagsRequest = z.infer<typeof bulkTagsSchema>;

export const maintenanceSchema = z
  .object({
    reason: z.string().trim().min(1).max(500),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
  })
  .refine((value) => !value.startsAt || !value.endsAt || value.endsAt > value.startsAt, {
    message: 'endsAt must be after startsAt',
    path: ['endsAt'],
  });

export type MaintenanceRequest = z.infer<typeof maintenanceSchema>;

export const bulkMaintenanceSchema = bulkIdsSchema
  .extend({
    reason: z.string().trim().min(1).max(500),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
  })
  .refine((value) => !value.startsAt || !value.endsAt || value.endsAt > value.startsAt, {
    message: 'endsAt must be after startsAt',
    path: ['endsAt'],
  });

export type BulkMaintenanceRequest = z.infer<typeof bulkMaintenanceSchema>;

export type ServerSummary = {
  id: string;
  name: string;
  hostname: string | null;
  primaryIp: string | null;
  description: string;
  status: ServerStatus;
  agentStatus: AgentStatus;
  osName: string | null;
  osVersion: string | null;
  kernelVersion: string | null;
  architecture: string | null;
  autoDetectSystem?: boolean;
  systemInfoStatus?: SystemInfoStatus;
  cpuCores: number | null;
  agentVersion: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  spaceId?: string | null;
  spaceName?: string | null;
  /** @deprecated Use spaceId */
  groupId: string | null;
  /** @deprecated Use spaceName */
  groupName: string | null;
  maintenanceMode: boolean;
  version: number;
  credentialId: string | null;
  sshKeyId?: string | null;
  sshUser?: string | null;
  sshPort?: number | null;
  cpuUsagePercent: number | null;
  memoryUsedBytes: number | null;
  memoryTotalBytes: number | null;
  diskUsedBytes: number | null;
  diskTotalBytes: number | null;
  uptimeSeconds: number | null;
};

export type ServerListResponse = {
  items: ServerSummary[];
  page: number;
  pageSize: number;
  total: number;
};

export type EnrollmentTokenResponse = {
  serverId: string;
  expiresAt: string;
  token: string;
  installCommand: string;
  enrollCommand: string;
};

export type ServerMetricPoint = {
  timestamp: string;
  cpuUsagePercent: number | null;
  load1: number | null;
  load5: number | null;
  load15: number | null;
  memoryUsedBytes: number | null;
  memoryTotalBytes: number | null;
  swapUsedBytes: number | null;
  swapTotalBytes: number | null;
  uptimeSeconds: number | null;
  processCount: number | null;
  disks: DiskMetric[];
  incomplete: boolean;
  networkRxBytes: number | null;
  networkTxBytes: number | null;
};

export type ServerAuditEvent = {
  id: string;
  action: string;
  actorId: string | null;
  requestId: string | null;
  createdAt: string;
  metadata: Record<string, string | number | boolean>;
  targetType?: string;
  targetId?: string | null;
  serverId?: string | null;
  result?: string;
};

export type ServerDetail = ServerSummary & {
  latestMetric: ServerMetricPoint | null;
};

export type ServerMetricsResponse = {
  items: ServerMetricPoint[];
};

export type ServerAuditResponse = {
  items: ServerAuditEvent[];
  page?: number;
  pageSize?: number;
  total?: number;
};

export type BulkItemResult = {
  serverId: string;
  success: boolean;
  operationId?: string;
  errorCode?: string;
};

export type BulkActionResponse = {
  results: BulkItemResult[];
};

export type AgentInfo = {
  id: string | null;
  serverId: string;
  status: AgentStatus;
  version: string | null;
  connectedAt: string | null;
  lastSeenAt: string | null;
  revokedAt: string | null;
  rotatedAt: string | null;
};

export type MaintenanceInfo = {
  active: boolean;
  reason: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdBy: string | null;
};
