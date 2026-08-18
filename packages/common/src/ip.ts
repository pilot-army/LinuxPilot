const IPV4_PATTERN =
  /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6_MAX_LENGTH = 45;
const FORWARDED_MAX_LENGTH = 256;

export function isValidIp(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > IPV6_MAX_LENGTH) {
    return false;
  }
  if (IPV4_PATTERN.test(trimmed)) {
    return true;
  }
  return isValidIpv6(trimmed);
}

function isValidIpv6(value: string): boolean {
  if (value.includes('%') || /[^0-9a-fA-F:]/.test(value)) {
    return false;
  }
  if ((value.match(/::/g) ?? []).length > 1) {
    return false;
  }
  const groups = value.split(':');
  if (groups.length < 2 || groups.length > 8) {
    return false;
  }
  for (const group of groups) {
    if (group.length === 0) {
      continue;
    }
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) {
      return false;
    }
  }
  return value.includes(':');
}

export function parseForwardedFor(header: string | undefined): string | undefined {
  if (!header || header.length > FORWARDED_MAX_LENGTH) {
    return undefined;
  }
  // Reject ASCII control characters that must never appear in forwarded headers.
  // eslint-disable-next-line no-control-regex -- explicit control-character filter
  if (/[\u0000-\u001F\u007F]/.test(header)) {
    return undefined;
  }

  const first = header.split(',')[0]?.trim();
  if (!first || !isValidIp(first)) {
    return undefined;
  }
  return first;
}

export function sanitizeIpAddress(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!isValidIp(trimmed)) {
    return undefined;
  }
  return trimmed;
}
