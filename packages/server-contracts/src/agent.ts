import { z } from 'zod';
import { diskMetricSchema, optionalIpSchema } from './servers';

export const agentPublicKeySchema = z
  .string()
  .trim()
  .min(80)
  .max(300)
  .refine((value) => value.includes('BEGIN PUBLIC KEY') && value.includes('END PUBLIC KEY'), {
    message: 'Public key must be an SPKI PEM',
  });

export const enrollAgentSchema = z.object({
  serverId: z.string().uuid(),
  enrollmentToken: z.string().min(16).max(128),
  publicKey: agentPublicKeySchema,
  agentVersion: z.string().trim().min(1).max(32),
});

export type EnrollAgentRequest = z.infer<typeof enrollAgentSchema>;

export const agentHeartbeatSchema = z.object({
  hostname: z.string().trim().min(1).max(255),
  primaryIp: optionalIpSchema,
  osName: z.string().trim().min(1).max(64),
  osVersion: z.string().trim().min(1).max(64),
  kernelVersion: z.string().trim().min(1).max(64),
  architecture: z.string().trim().min(1).max(32),
  agentVersion: z.string().trim().min(1).max(32),
  cpuCores: z.number().int().min(1).max(1024).optional(),
  cpuUsagePercent: z.number().min(0).max(100).nullable(),
  load1: z.number().nonnegative().nullable(),
  load5: z.number().nonnegative().nullable(),
  load15: z.number().nonnegative().nullable(),
  memoryUsedBytes: z.number().nonnegative().nullable(),
  memoryTotalBytes: z.number().positive().nullable(),
  swapUsedBytes: z.number().nonnegative().nullable(),
  swapTotalBytes: z.number().nonnegative().nullable(),
  uptimeSeconds: z.number().nonnegative().nullable(),
  processCount: z.number().int().nonnegative().nullable().optional(),
  disks: z.array(diskMetricSchema).max(64),
  networkRxBytes: z.number().nonnegative().nullable().optional(),
  networkTxBytes: z.number().nonnegative().nullable().optional(),
});

export type AgentHeartbeatRequest = z.infer<typeof agentHeartbeatSchema>;

export const agentMetricsSchema = z
  .object({
    timestamp: z.coerce.date().optional(),
    cpuPercent: z.number().min(0).max(100).optional(),
    cpuUsagePercent: z.number().min(0).max(100).nullable().optional(),
    memoryUsedBytes: z.number().nonnegative().nullable().optional(),
    memoryTotalBytes: z.number().positive().nullable().optional(),
    diskUsedBytes: z.number().nonnegative().optional(),
    diskTotalBytes: z.number().positive().optional(),
    load1: z.number().nonnegative().nullable().optional(),
    load5: z.number().nonnegative().nullable().optional(),
    load15: z.number().nonnegative().nullable().optional(),
    networkRxBytes: z.number().nonnegative().nullable().optional(),
    networkTxBytes: z.number().nonnegative().nullable().optional(),
    uptimeSeconds: z.number().nonnegative().nullable().optional(),
    processCount: z.number().int().nonnegative().nullable().optional(),
    swapUsedBytes: z.number().nonnegative().nullable().optional(),
    swapTotalBytes: z.number().nonnegative().nullable().optional(),
    disks: z.array(diskMetricSchema).max(64).optional(),
  })
  .refine((value) => value.cpuPercent !== undefined || value.cpuUsagePercent !== undefined, {
    message: 'cpuUsagePercent or cpuPercent is required',
  })
  .transform((value) => {
    const cpu = value.cpuUsagePercent ?? value.cpuPercent ?? null;
    const disks =
      value.disks ??
      (value.diskUsedBytes !== undefined && value.diskTotalBytes
        ? [
            {
              mountPoint: '/',
              filesystem: 'unknown',
              usedBytes: value.diskUsedBytes,
              totalBytes: value.diskTotalBytes,
              usedPercent: (value.diskUsedBytes / value.diskTotalBytes) * 100,
            },
          ]
        : []);
    return {
      timestamp: value.timestamp,
      cpuUsagePercent: cpu,
      load1: value.load1 ?? null,
      load5: value.load5 ?? null,
      load15: value.load15 ?? null,
      memoryUsedBytes: value.memoryUsedBytes ?? null,
      memoryTotalBytes: value.memoryTotalBytes ?? null,
      swapUsedBytes: value.swapUsedBytes ?? null,
      swapTotalBytes: value.swapTotalBytes ?? null,
      uptimeSeconds: value.uptimeSeconds ?? null,
      processCount: value.processCount ?? null,
      disks,
      networkRxBytes: value.networkRxBytes ?? null,
      networkTxBytes: value.networkTxBytes ?? null,
    };
  });

export type AgentMetricsRequest = z.infer<typeof agentMetricsSchema>;

export const rotateAgentSchema = z.object({
  publicKey: agentPublicKeySchema,
});

export type RotateAgentRequest = z.infer<typeof rotateAgentSchema>;

export type EnrollAgentResponse = {
  serverId: string;
  credentialId: string;
  heartbeatPath: string;
};

export type AgentHeartbeatResponse = {
  accepted: true;
  status: 'ONLINE' | 'DEGRADED' | 'MAINTENANCE';
};

export type RotateAgentResponse = {
  credentialId: string;
};
