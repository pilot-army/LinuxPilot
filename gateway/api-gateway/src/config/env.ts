import { ConfigValidationError, loadConfig, resolvePem } from '@linuxpilot/config';
import { gatewayEnvSchema, type GatewayEnv } from './env.schema';

export function loadGatewayEnv(env: NodeJS.ProcessEnv = process.env): GatewayEnv {
  const parsed = loadConfig(gatewayEnvSchema, env);
  const publicKey = resolvePem(env, 'JWT_ACCESS_PUBLIC_KEY', 'JWT_ACCESS_PUBLIC_KEY_PATH');

  const issues: string[] = [];
  if (env.JWT_ACCESS_SECRET) {
    issues.push('JWT_ACCESS_SECRET is no longer supported; use JWT_ACCESS_PUBLIC_KEY');
  }
  if (env.JWT_ACCESS_PRIVATE_KEY || env.JWT_ACCESS_PRIVATE_KEY_PATH) {
    issues.push('Gateway must not receive the JWT private key');
  }
  if (parsed.NODE_ENV === 'production' && !parsed.COOKIE_SECURE) {
    issues.push('COOKIE_SECURE must be true in production');
  }
  if (issues.length > 0) {
    throw new ConfigValidationError(issues);
  }

  return {
    ...parsed,
    JWT_ACCESS_PUBLIC_KEY: publicKey,
  };
}
