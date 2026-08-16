import { z } from 'zod';
import { boolFromEnv, nonEmptyString, secretString } from '@linuxpilot/config';

export const gatewayEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  GATEWAY_PORT: z.coerce.number().int().positive(),
  GATEWAY_HOST: nonEmptyString('GATEWAY_HOST'),
  FRONTEND_ORIGIN: nonEmptyString('FRONTEND_ORIGIN'),
  AUTH_SERVICE_URL: nonEmptyString('AUTH_SERVICE_URL'),
  AUTH_SERVICE_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  JWT_ISSUER: nonEmptyString('JWT_ISSUER'),
  JWT_AUDIENCE: nonEmptyString('JWT_AUDIENCE'),
  JWT_ACCESS_TTL: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_ACCESS_TTL must look like 15m, 900s, 1h, or 1d'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().max(365),
  COOKIE_SECURE: boolFromEnv('COOKIE_SECURE'),
  TRUST_PROXY: boolFromEnv('TRUST_PROXY'),
  TRUST_PROXY_HOPS: z.coerce.number().int().positive().default(1),
  LOGIN_RATE_LIMIT: z.coerce.number().int().positive(),
  LOGIN_RATE_LIMIT_TTL_MS: z.coerce.number().int().positive().default(60_000),
  REFRESH_RATE_LIMIT: z.coerce.number().int().positive(),
  REFRESH_RATE_LIMIT_TTL_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_TTL_MS: z.coerce.number().int().positive(),
  RATE_LIMIT_STORE: z.enum(['memory']).default('memory'),
  SERVICE_AUTH_SECRET: secretString('SERVICE_AUTH_SECRET'),
  SERVICE_AUTH_SECRET_PREVIOUS: secretString('SERVICE_AUTH_SECRET_PREVIOUS').optional(),
  LOG_LEVEL: nonEmptyString('LOG_LEVEL'),
});

export type GatewayEnvInput = z.infer<typeof gatewayEnvSchema>;

export type GatewayEnv = GatewayEnvInput & {
  JWT_ACCESS_PUBLIC_KEY: string;
};
