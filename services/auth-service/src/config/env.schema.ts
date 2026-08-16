import { z } from 'zod';
import { boolFromEnv, nonEmptyString, secretString } from '@linuxpilot/config';

export const authEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  AUTH_SERVICE_PORT: z.coerce.number().int().positive(),
  AUTH_SERVICE_HOST: nonEmptyString('AUTH_SERVICE_HOST'),
  DATABASE_URL: nonEmptyString('DATABASE_URL'),
  JWT_ACCESS_TTL: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_ACCESS_TTL must look like 15m, 900s, 1h, or 1d'),
  JWT_ISSUER: nonEmptyString('JWT_ISSUER'),
  JWT_AUDIENCE: nonEmptyString('JWT_AUDIENCE'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().max(365),
  REFRESH_REUSE_GRACE_MS: z.coerce.number().int().nonnegative().default(5000),
  ARGON2_MEMORY_COST: z.coerce.number().int().positive(),
  ARGON2_TIME_COST: z.coerce.number().int().min(2),
  ARGON2_PARALLELISM: z.coerce.number().int().positive(),
  LOG_LEVEL: nonEmptyString('LOG_LEVEL'),
  SERVICE_AUTH_SECRET: secretString('SERVICE_AUTH_SECRET'),
  SERVICE_AUTH_SECRET_PREVIOUS: secretString('SERVICE_AUTH_SECRET_PREVIOUS').optional(),
  SERVICE_AUTH_MAX_SKEW_MS: z.coerce.number().int().positive().default(30_000),
  SESSION_CLEANUP_INTERVAL_MS: z.coerce.number().int().positive().default(900_000),
  SESSION_REVOKED_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  AUDIT_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
  AUTH_BIND_LOOPBACK_ONLY: boolFromEnv('AUTH_BIND_LOOPBACK_ONLY').optional(),
});

export type AuthEnvInput = z.infer<typeof authEnvSchema>;

export type AuthEnv = AuthEnvInput & {
  JWT_ACCESS_PRIVATE_KEY: string;
  JWT_ACCESS_PUBLIC_KEY: string;
};
