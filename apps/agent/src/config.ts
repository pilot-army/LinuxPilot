import { z } from 'zod';
import { loadConfig, nonEmptyString } from '@linuxpilot/config';

export const agentEnvSchema = z
  .object({
    LINUXPILOT_GATEWAY_URL: nonEmptyString('LINUXPILOT_GATEWAY_URL'),
    LINUXPILOT_STATE_DIR: z.string().default('/var/lib/linuxpilot'),
    HEARTBEAT_INTERVAL_MS: z.coerce.number().int().min(5_000).max(300_000).default(30_000),
    AGENT_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(10_000),
    AGENT_MAX_RETRIES: z.coerce.number().int().min(0).max(8).default(4),
    AGENT_ALLOW_NON_LINUX: z
      .enum(['true', 'false', '1', '0'])
      .optional()
      .transform((value) => value === 'true' || value === '1'),
  })
  .superRefine((value, ctx) => {
    if (
      !value.LINUXPILOT_GATEWAY_URL.startsWith('http://') &&
      !value.LINUXPILOT_GATEWAY_URL.startsWith('https://')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['LINUXPILOT_GATEWAY_URL'],
        message: 'LINUXPILOT_GATEWAY_URL must be an http(s) URL',
      });
    }
  });

export type AgentEnv = z.infer<typeof agentEnvSchema>;

export function loadAgentEnv(env: NodeJS.ProcessEnv = process.env): AgentEnv {
  return loadConfig(agentEnvSchema, env);
}
