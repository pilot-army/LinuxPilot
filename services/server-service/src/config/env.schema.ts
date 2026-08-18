import { z } from 'zod';
import { boolFromEnv, nonEmptyString, secretString } from '@linuxpilot/config';

export const DEV_SSH_KEYS_MASTER_KEY = 'dev-only-ssh-keys-master-key-do-not-use-in-prod';

export const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    SERVER_SERVICE_PORT: z.coerce.number().int().positive(),
    SERVER_SERVICE_HOST: nonEmptyString('SERVER_SERVICE_HOST'),
    DATABASE_URL: nonEmptyString('DATABASE_URL'),
    JWT_ISSUER: nonEmptyString('JWT_ISSUER'),
    JWT_AUDIENCE: nonEmptyString('JWT_AUDIENCE'),
    LOG_LEVEL: nonEmptyString('LOG_LEVEL'),
    SERVICE_AUTH_SECRET: secretString('SERVICE_AUTH_SECRET'),
    SERVICE_AUTH_SECRET_PREVIOUS: secretString('SERVICE_AUTH_SECRET_PREVIOUS').optional(),
    SERVICE_AUTH_MAX_SKEW_MS: z.coerce.number().int().positive().default(30_000),
    HEARTBEAT_INTERVAL_MS: z.coerce.number().int().min(5_000).max(300_000).default(30_000),
    OFFLINE_TIMEOUT_MS: z.coerce.number().int().min(15_000).max(3_600_000).default(90_000),
    ENROLLMENT_TOKEN_TTL_MS: z.coerce.number().int().min(60_000).max(86_400_000).default(900_000),
    METRICS_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(14),
    METRICS_CLEANUP_INTERVAL_MS: z.coerce.number().int().positive().default(900_000),
    METRICS_CLEANUP_BATCH_SIZE: z.coerce.number().int().min(50).max(5_000).default(500),
    STATUS_SWEEP_INTERVAL_MS: z.coerce.number().int().min(5_000).max(300_000).default(30_000),
    AGENT_TIMESTAMP_WINDOW_MS: z.coerce.number().int().min(5_000).max(300_000).default(30_000),
    AGENT_REQUEST_BODY_LIMIT: z.coerce.number().int().min(1024).max(1_048_576).default(32_768),
    DEGRADED_CPU_PERCENT: z.coerce.number().min(50).max(100).default(90),
    DEGRADED_MEMORY_PERCENT: z.coerce.number().min(50).max(100).default(90),
    DEGRADED_DISK_PERCENT: z.coerce.number().min(50).max(100).default(90),
    AUDIT_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
    EVENTS_RETENTION_DAYS: z.coerce.number().int().min(7).max(730).default(90),
    AGENT_MIN_SUPPORTED_VERSION: z.string().trim().max(32).optional().default(''),
    HEALTH_HYSTERESIS_PERCENT: z.coerce.number().min(0).max(20).default(5),
    METRICS_MIN_INTERVAL_MS: z.coerce.number().int().min(0).max(300_000).default(5_000),
    METRICS_MAX_FUTURE_MS: z.coerce.number().int().min(1_000).max(600_000).default(60_000),
    METRICS_MAX_AGE_MS: z.coerce.number().int().min(60_000).max(86_400_000).default(3_600_000),
    OPERATION_TTL_MS: z.coerce.number().int().min(60_000).max(86_400_000).default(3_600_000),
    OPERATION_MAX_PARALLEL: z.coerce.number().int().min(1).max(20).default(3),
    BULK_MAX_SERVERS: z.coerce.number().int().min(1).max(200).default(50),
    PUBLIC_GATEWAY_URL: nonEmptyString('PUBLIC_GATEWAY_URL'),
    SERVER_BIND_LOOPBACK_ONLY: boolFromEnv('SERVER_BIND_LOOPBACK_ONLY').optional(),
    SSH_KEYS_MASTER_KEY: secretString('SSH_KEYS_MASTER_KEY').default(DEV_SSH_KEYS_MASTER_KEY),
    SSH_KEYS_MASTER_KEY_VERSION: nonEmptyString('SSH_KEYS_MASTER_KEY_VERSION').default('v1'),
    SSH_KEYS_MASTER_KEY_PREVIOUS: secretString('SSH_KEYS_MASTER_KEY_PREVIOUS').optional(),
    SSH_KEYS_MASTER_KEY_PREVIOUS_VERSION: nonEmptyString(
      'SSH_KEYS_MASTER_KEY_PREVIOUS_VERSION',
    ).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.OFFLINE_TIMEOUT_MS <= value.HEARTBEAT_INTERVAL_MS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['OFFLINE_TIMEOUT_MS'],
        message: 'OFFLINE_TIMEOUT_MS must be greater than HEARTBEAT_INTERVAL_MS',
      });
    }
    if (value.STATUS_SWEEP_INTERVAL_MS >= value.OFFLINE_TIMEOUT_MS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['STATUS_SWEEP_INTERVAL_MS'],
        message: 'STATUS_SWEEP_INTERVAL_MS must be less than OFFLINE_TIMEOUT_MS',
      });
    }
    if (value.AGENT_TIMESTAMP_WINDOW_MS > value.OFFLINE_TIMEOUT_MS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AGENT_TIMESTAMP_WINDOW_MS'],
        message: 'AGENT_TIMESTAMP_WINDOW_MS must not exceed OFFLINE_TIMEOUT_MS',
      });
    }
  });

export type ServerEnvInput = z.infer<typeof serverEnvSchema>;

export type ServerEnv = ServerEnvInput & {
  JWT_ACCESS_PUBLIC_KEY: string;
};
