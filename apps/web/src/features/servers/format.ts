export function formatBytes(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let amount = value;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount.toFixed(amount >= 10 ? 0 : 1)} ${units[unit]}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return `${value.toFixed(1)}%`;
}

export function formatPercentCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return `${Math.round(value)}%`;
}

export function formatAvailability(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(2)}%`;
}

export function formatUptime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) {
    return '—';
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const delta = Date.now() - Date.parse(iso);
  if (Number.isNaN(delta)) {
    return '—';
  }
  if (delta < 60_000) {
    return 'just now';
  }
  if (delta < 3_600_000) {
    return `${Math.floor(delta / 60_000)}m ago`;
  }
  if (delta < 86_400_000) {
    return `${Math.floor(delta / 3_600_000)}h ago`;
  }
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

export function formatLastSeen(
  iso: string | null | undefined,
  copy: {
    never: string;
    justNow: string;
    secondsAgo: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
  },
  now = Date.now(),
): string {
  if (!iso) {
    return copy.never;
  }
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) {
    return copy.never;
  }
  const delta = Math.max(0, now - timestamp);
  if (delta < 10_000) {
    return copy.justNow;
  }
  if (delta < 60_000) {
    return interpolate(copy.secondsAgo, { count: Math.floor(delta / 1000) });
  }
  if (delta < 3_600_000) {
    return interpolate(copy.minutesAgo, { count: Math.floor(delta / 60_000) });
  }
  if (delta < 86_400_000) {
    return interpolate(copy.hoursAgo, { count: Math.floor(delta / 3_600_000) });
  }
  return interpolate(copy.daysAgo, { count: Math.floor(delta / 86_400_000) });
}

export function formatExactTime(iso: string | null | undefined, locale: string): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(locale === 'uk' ? 'uk-UA' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatSyncedAt(
  iso: string | null | undefined,
  copy: { justNow: string; minutesAgo: string; never: string },
  now = Date.now(),
): string {
  if (!iso) {
    return copy.never;
  }
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) {
    return copy.never;
  }
  const minutes = Math.max(0, Math.round((now - timestamp) / 60_000));
  if (minutes < 1) {
    return copy.justNow;
  }
  return interpolate(copy.minutesAgo, { count: minutes });
}

export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}
