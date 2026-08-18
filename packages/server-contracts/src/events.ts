import { z } from 'zod';
import { EVENT_SEVERITIES, EVENT_TYPES } from './status';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './servers';

export const listEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  serverId: z.string().uuid().optional(),
  type: z.enum(Object.values(EVENT_TYPES) as [string, ...string[]]).optional(),
  severity: z.enum(Object.values(EVENT_SEVERITIES) as [string, ...string[]]).optional(),
  source: z.string().trim().max(32).optional(),
  q: z.string().trim().max(100).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;

export type ServerEvent = {
  id: string;
  serverId: string | null;
  type: string;
  severity: string;
  source: string;
  messageKey: string;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
};

export type ServerEventListResponse = {
  items: ServerEvent[];
  page: number;
  pageSize: number;
  total: number;
};
