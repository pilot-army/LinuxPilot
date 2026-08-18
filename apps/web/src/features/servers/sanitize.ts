const SENSITIVE_KEY =
  /token|secret|password|cookie|signature|authorization|private|credential|enrollment/i;

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

export function sanitizeRecord(
  value: Record<string, unknown> | null | undefined,
): Record<string, string | number | boolean> {
  if (!value) {
    return {};
  }
  const clean: Record<string, string | number | boolean> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isSensitiveKey(key)) {
      continue;
    }
    if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
      clean[key] = entry;
    }
  }
  return clean;
}

export function shortenKey(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  if (value.length <= 12) {
    return value;
  }
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
