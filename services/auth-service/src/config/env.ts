import { ConfigValidationError, loadConfig, resolvePem } from '@linuxpilot/config';
import { authEnvSchema, type AuthEnv } from './env.schema';

export function loadAuthEnv(env: NodeJS.ProcessEnv = process.env): AuthEnv {
  const parsed = loadConfig(authEnvSchema, env);
  const privateKey = resolvePem(env, 'JWT_ACCESS_PRIVATE_KEY', 'JWT_ACCESS_PRIVATE_KEY_PATH');
  const publicKey = resolvePem(env, 'JWT_ACCESS_PUBLIC_KEY', 'JWT_ACCESS_PUBLIC_KEY_PATH');

  if (parsed.NODE_ENV === 'production') {
    const issues: string[] = [];
    if (env.JWT_ACCESS_SECRET) {
      issues.push('JWT_ACCESS_SECRET is no longer supported; use RS256 key files');
    }
    if (parsed.SERVICE_AUTH_SECRET.length < 32) {
      issues.push('SERVICE_AUTH_SECRET must be at least 32 characters');
    }
    if (parsed.AUTH_SERVICE_HOST !== '127.0.0.1' && parsed.AUTH_BIND_LOOPBACK_ONLY === true) {
      issues.push('AUTH_BIND_LOOPBACK_ONLY requires AUTH_SERVICE_HOST=127.0.0.1');
    }
    if (issues.length > 0) {
      throw new ConfigValidationError(issues);
    }
  }

  return {
    ...parsed,
    JWT_ACCESS_PRIVATE_KEY: privateKey,
    JWT_ACCESS_PUBLIC_KEY: publicKey,
  };
}
