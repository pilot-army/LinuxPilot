import { z } from 'zod';
import {
  OPERATION_STATUSES,
  OPERATION_TYPES,
  type OperationStatus,
  type OperationType,
} from './status';
import { DEFAULT_PAGE_SIZE, MAX_BULK_SERVERS, MAX_PAGE_SIZE } from './servers';

export const createOperationSchema = z.object({
  type: z.enum([
    OPERATION_TYPES.REBOOT,
    OPERATION_TYPES.SHUTDOWN,
    OPERATION_TYPES.REFRESH_INVENTORY,
    OPERATION_TYPES.REFRESH_METRICS,
    OPERATION_TYPES.CHECK_UPDATES,
    OPERATION_TYPES.UPDATE_AGENT,
  ]),
  payload: z.record(z.unknown()).optional().default({}),
  idempotencyKey: z.string().trim().min(8).max(80).optional(),
});

export type CreateOperationRequest = z.input<typeof createOperationSchema>;

export const listOperationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  serverId: z.string().uuid().optional(),
  type: z.enum(Object.values(OPERATION_TYPES) as [string, ...string[]]).optional(),
  status: z.enum(Object.values(OPERATION_STATUSES) as [string, ...string[]]).optional(),
  requestedBy: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ListOperationsQuery = z.infer<typeof listOperationsQuerySchema>;

export const operationResultSchema = z.object({
  success: z.boolean(),
  errorCode: z.string().trim().max(64).optional(),
  result: z.record(z.unknown()).optional().default({}),
});

export type OperationResultRequest = z.infer<typeof operationResultSchema>;

export const bulkOperationsSchema = z.object({
  serverIds: z.array(z.string().uuid()).min(1).max(MAX_BULK_SERVERS),
  type: createOperationSchema.shape.type,
  payload: z.record(z.unknown()).optional().default({}),
  idempotencyKey: z.string().trim().min(8).max(80).optional(),
});

export type BulkOperationsRequest = z.input<typeof bulkOperationsSchema>;

export type ServerOperation = {
  id: string;
  serverId: string;
  serverName?: string | null;
  type: OperationType;
  status: OperationStatus;
  requestedBy: string | null;
  idempotencyKey: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  deliveredAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string;
  errorCode: string | null;
  result: Record<string, unknown> | null;
  version: number;
};

export type ServerOperationListResponse = {
  items: ServerOperation[];
  page: number;
  pageSize: number;
  total: number;
};
