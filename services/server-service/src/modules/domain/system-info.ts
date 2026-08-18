import { UNKNOWN_SYSTEM_VALUE, type SystemInfoStatus } from '@linuxpilot/server-contracts';

const AMD64_ALIASES = new Set(['amd64', 'x86_64', 'x64']);
const ARM64_ALIASES = new Set(['arm64', 'aarch64']);

export function normalizeArchitecture(value: string | null | undefined): 'amd64' | 'arm64' | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (AMD64_ALIASES.has(normalized)) {
    return 'amd64';
  }
  if (ARM64_ALIASES.has(normalized)) {
    return 'arm64';
  }
  return null;
}

export function normalizeOsField(value: string | null | undefined): string {
  const normalized = value?.trim() ?? '';
  if (!normalized || normalized.toLowerCase() === UNKNOWN_SYSTEM_VALUE) {
    return UNKNOWN_SYSTEM_VALUE;
  }
  return normalized.slice(0, 64);
}

export function isUnknownSystemValue(value: string | null | undefined): boolean {
  return !value || value.trim().toLowerCase() === UNKNOWN_SYSTEM_VALUE;
}

export function resolveSystemInfoStatus(input: {
  osName: string | null;
  architecture: string | null;
  lastSeenAt: Date | null;
}): SystemInfoStatus {
  const unknown = isUnknownSystemValue(input.osName) || isUnknownSystemValue(input.architecture);
  if (input.lastSeenAt && unknown) {
    return 'unknown';
  }
  if (!unknown) {
    return 'detected';
  }
  return 'pending';
}
