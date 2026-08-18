import { z } from 'zod';
import { GROUP_COLOR_PATTERN, MAX_SERVER_TAGS, SERVER_TAG_PATTERN } from './servers';

export const SPACE_ENVIRONMENTS = ['production', 'staging', 'development', 'custom'] as const;
export type SpaceEnvironment = (typeof SPACE_ENVIRONMENTS)[number];

export const SPACE_ICONS = [
  'server',
  'code',
  'container',
  'team',
  'shield',
  'database',
  'network',
  'backup',
] as const;
export type ServerSpaceIcon = (typeof SPACE_ICONS)[number];

export const SPACE_RESERVED_SLUGS = [
  'new',
  'create',
  'edit',
  'settings',
  'admin',
  'api',
  'import',
  'unassigned',
  'ungrouped',
  'all',
  'default',
  'system',
  'groups',
  'servers',
  'spaces',
] as const;

export const SPACE_NAME_MAX = 80;
export const SPACE_SLUG_MAX = 80;
export const SPACE_DESCRIPTION_MAX = 500;

export function isReservedSpaceSlug(slug: string): boolean {
  return (SPACE_RESERVED_SLUGS as readonly string[]).includes(slug);
}

export function slugifySpaceName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SPACE_SLUG_MAX);
  const normalized = slug || 'space';
  if (!isReservedSpaceSlug(normalized)) {
    return normalized;
  }
  return `${normalized}-space`.slice(0, SPACE_SLUG_MAX);
}

export const GROUP_COLOR_TOKENS = {
  blue: '#3b82f6',
  cyan: '#22d3ee',
  green: '#22c55e',
  violet: '#8b5cf6',
  amber: '#f59e0b',
  red: '#ef4444',
  gray: '#64748b',
} as const;

export type GroupColorToken = keyof typeof GROUP_COLOR_TOKENS;
export type SpaceColorToken = GroupColorToken;

export const GROUP_COLOR_TOKEN_VALUES = Object.keys(GROUP_COLOR_TOKENS) as GroupColorToken[];
export const SPACE_COLOR_TOKEN_VALUES = GROUP_COLOR_TOKEN_VALUES;

const spaceColorSchema = z
  .string()
  .trim()
  .transform((value) => {
    const token = value.toLowerCase() as GroupColorToken;
    if (token in GROUP_COLOR_TOKENS) {
      return GROUP_COLOR_TOKENS[token];
    }
    return value;
  })
  .refine((value) => GROUP_COLOR_PATTERN.test(value), { message: 'Invalid space color' });

const spaceTagsSchema = z
  .array(z.string().trim().regex(SERVER_TAG_PATTERN))
  .max(MAX_SERVER_TAGS)
  .optional()
  .default([]);

const spaceSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Invalid space slug' })
  .max(SPACE_SLUG_MAX)
  .refine((value) => !isReservedSpaceSlug(value), { message: 'Reserved space slug' });

const spaceIconSchema = z.enum(SPACE_ICONS);

export const createSpaceSchema = z.object({
  name: z.string().trim().min(1).max(SPACE_NAME_MAX),
  slug: spaceSlugSchema.optional(),
  description: z.string().trim().max(SPACE_DESCRIPTION_MAX).optional().default(''),
  icon: spaceIconSchema.optional().default('server'),
  color: spaceColorSchema.optional().default(GROUP_COLOR_TOKENS.blue),
  tags: spaceTagsSchema,
  notificationsEnabled: z.boolean().optional().default(true),
  serverIds: z.array(z.string().uuid()).max(50).optional().default([]),
});

export type CreateSpaceRequest = z.infer<typeof createSpaceSchema>;
export const createGroupSchema = createSpaceSchema;
export type CreateGroupRequest = CreateSpaceRequest;

export const updateSpaceSchema = z
  .object({
    name: z.string().trim().min(1).max(SPACE_NAME_MAX).optional(),
    slug: spaceSlugSchema.optional(),
    description: z.string().trim().max(SPACE_DESCRIPTION_MAX).optional(),
    icon: spaceIconSchema.optional(),
    color: spaceColorSchema.optional(),
    tags: z.array(z.string().trim().regex(SERVER_TAG_PATTERN)).max(MAX_SERVER_TAGS).optional(),
    notificationsEnabled: z.boolean().optional(),
    version: z.number().int().min(1).optional(),
  })
  .refine(
    (value) =>
      Object.keys(value).some(
        (key) => key !== 'version' && value[key as keyof typeof value] !== undefined,
      ),
    { message: 'At least one field is required' },
  );

export type UpdateSpaceRequest = z.infer<typeof updateSpaceSchema>;
export const updateGroupSchema = updateSpaceSchema;
export type UpdateGroupRequest = UpdateSpaceRequest;

export const deleteSpaceSchema = z
  .object({
    moveToSpaceId: z.string().uuid().optional().nullable(),
  })
  .optional()
  .default({});

export type DeleteSpaceRequest = z.infer<typeof deleteSpaceSchema>;

export const attachServersSchema = z.object({
  serverIds: z.array(z.string().uuid()).min(1).max(50),
});

export type AttachServersRequest = z.infer<typeof attachServersSchema>;

export type ServerSpace = {
  id: string;
  name: string;
  slug?: string;
  description: string;
  icon?: ServerSpaceIcon;
  color: string;
  tags: string[];
  notificationsEnabled: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  serverCount: number;
  onlineCount: number;
  offlineCount: number;
  warningCount: number;
  withoutAgentCount: number;
  averageCpuPercent: number | null;
  averageMemoryPercent: number | null;
  averageDiskPercent: number | null;
  memberNames: string[];
};

export type ServerGroup = ServerSpace;

export type ServerSpaceListResponse = {
  items: ServerSpace[];
  unassignedCount: number;
  /** @deprecated Use unassignedCount */
  ungroupedCount: number;
};

export type ServerGroupListResponse = ServerSpaceListResponse;
