import { readFileSync } from 'node:fs';

export const DEV_KEY_MARKER = 'LINUXPILOT_DEV_ONLY';

export function resolvePem(env: NodeJS.ProcessEnv, valueKey: string, pathKey: string): string {
  const inline = env[valueKey]?.trim();
  const path = env[pathKey]?.trim();

  if (inline && path) {
    throw new Error(`${valueKey} and ${pathKey} cannot both be set`);
  }
  if (!inline && !path) {
    throw new Error(`${valueKey} or ${pathKey} is required`);
  }

  const pem = inline ? inline.replace(/\\n/g, '\n') : readFileSync(path as string, 'utf8');
  if (env.NODE_ENV === 'production' && pem.includes(DEV_KEY_MARKER)) {
    throw new Error(`${valueKey} is a development key and cannot be used in production`);
  }

  const normalized = extractPem(pem);
  if (!normalized.includes('BEGIN') || !normalized.includes('KEY')) {
    throw new Error(`${valueKey} must be a PEM-encoded key`);
  }
  return normalized;
}

function extractPem(raw: string): string {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#') && !line.includes(DEV_KEY_MARKER))
    .join('\n');
}
