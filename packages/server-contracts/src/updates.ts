import { z } from 'zod';

export const agentUpdateStatusSchema = z.object({
  availableUpdates: z.number().int().min(0).max(100_000),
  securityUpdates: z.number().int().min(0).max(100_000),
  lastCheckedAt: z.coerce.date().optional(),
  rebootRequired: z.boolean().default(false),
  packages: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(128),
        current: z.string().trim().max(64).optional(),
        available: z.string().trim().max(64).optional(),
        security: z.boolean().optional(),
      }),
    )
    .max(200)
    .optional()
    .default([]),
  currentAgentVersion: z.string().trim().max(32).optional(),
  availableAgentVersion: z.string().trim().max(32).optional(),
});

export type AgentUpdateStatusRequest = z.infer<typeof agentUpdateStatusSchema>;

export type ServerUpdateStatus = {
  availableUpdates: number;
  securityUpdates: number;
  lastCheckedAt: string | null;
  rebootRequired: boolean;
  packages: Array<{
    name: string;
    current?: string;
    available?: string;
    security?: boolean;
  }>;
  currentAgentVersion: string | null;
  availableAgentVersion: string | null;
};
