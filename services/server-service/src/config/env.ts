import { ConfigValidationError, loadConfig, resolvePem } from '@linuxpilot/config';
import { DEV_SSH_KEYS_MASTER_KEY, serverEnvSchema, type ServerEnv } from './env.schema';

export function loadServerEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  const parsed = loadConfig(serverEnvSchema, env);
  const publicKey = resolvePem(env, 'JWT_ACCESS_PUBLIC_KEY', 'JWT_ACCESS_PUBLIC_KEY_PATH');

  if (parsed.NODE_ENV === 'production') {
    const issues: string[] = [];
    if (env.JWT_ACCESS_PRIVATE_KEY || env.JWT_ACCESS_PRIVATE_KEY_PATH) {
      issues.push('Server Service must not receive the JWT private key');
    }
    if (parsed.SERVICE_AUTH_SECRET.length < 32) {
      issues.push('SERVICE_AUTH_SECRET must be at least 32 characters');
    }
    if (
      parsed.SSH_KEYS_MASTER_KEY === DEV_SSH_KEYS_MASTER_KEY ||
      parsed.SSH_KEYS_MASTER_KEY.length < 32
    ) {
      issues.push('SSH_KEYS_MASTER_KEY must be a unique secret of at least 32 characters');
    }
    if (parsed.SERVER_SERVICE_HOST !== '127.0.0.1' && parsed.SERVER_BIND_LOOPBACK_ONLY === true) {
      issues.push('SERVER_BIND_LOOPBACK_ONLY requires SERVER_SERVICE_HOST=127.0.0.1');
    }
    if (issues.length > 0) {
      throw new ConfigValidationError(issues);
    }
  }

  return {
    ...parsed,
    JWT_ACCESS_PUBLIC_KEY: publicKey,
  };
}
