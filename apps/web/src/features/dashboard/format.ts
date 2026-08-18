import type { Locale } from '@linuxpilot/i18n';
import type { ChartPeriod, DashboardErrorCode } from './types';
import { ApiRequestError } from '../../api/client';

export function formatCompactPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return `${Math.round(value)}%`;
}

export function formatPrecisePercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return `${value.toFixed(2)}%`;
}

export function formatBytes(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) {
    return '—';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let amount = value;
  let index = 0;
  while (amount >= 1024 && index < units.length - 1) {
    amount /= 1024;
    index += 1;
  }
  const digits = amount >= 10 || index === 0 ? 0 : 1;
  return `${amount.toFixed(digits)} ${units[index]}`;
}

export function formatBytesPair(
  used: number | null | undefined,
  total: number | null | undefined,
): string | null {
  if (used === null || used === undefined || total === null || total === undefined) {
    return null;
  }
  return `${formatBytes(used)} / ${formatBytes(total)}`;
}

export function formatCoresPair(
  used: number | null | undefined,
  total: number | null | undefined,
): string | null {
  if (used === null || used === undefined || total === null || total === undefined) {
    return null;
  }
  return `${used.toFixed(1)} / ${Math.round(total)} vCPU`;
}

export function formatUptime(
  seconds: number | null | undefined,
  copy: { days: string; hours: string; minutes: string; none: string },
): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return copy.none;
  }
  const totalMinutes = Math.floor(seconds / 60);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) {
    return interpolate(copy.days, { days, hours });
  }
  if (hours > 0) {
    return interpolate(copy.hours, { hours, minutes });
  }
  return interpolate(copy.minutes, { minutes: Math.max(1, minutes) });
}

export function minutesSince(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) {
    return null;
  }
  const timestamp = Date.parse(iso);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return Math.max(0, Math.round((now - timestamp) / 60000));
}

export function formatUpdatedAt(
  iso: string | null | undefined,
  copy: { justNow: string; minutesAgo: string; never: string },
  now = Date.now(),
): string {
  const minutes = minutesSince(iso, now);
  if (minutes === null) {
    return copy.never;
  }
  if (minutes < 1) {
    return copy.justNow;
  }
  return interpolate(copy.minutesAgo, { count: minutes });
}

export function formatLastSeen(
  iso: string | null | undefined,
  copy: { never: string; justNow: string; minutesAgo: string },
  now = Date.now(),
): string {
  if (!iso) {
    return copy.never;
  }
  return formatUpdatedAt(iso, copy, now);
}

export function formatActivityTime(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat(locale === 'uk' ? 'uk-UA' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatChartTick(iso: string, period: ChartPeriod, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const localeTag = locale === 'uk' ? 'uk-UA' : 'en-GB';
  if (period === '7d') {
    return new Intl.DateTimeFormat(localeTag, { day: 'numeric', month: 'short' }).format(date);
  }
  return new Intl.DateTimeFormat(localeTag, { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}

export function toDashboardError(cause: unknown): DashboardErrorCode {
  if (cause instanceof ApiRequestError) {
    if (cause.status === 0 || cause.code === 'NETWORK_ERROR') {
      return 'network';
    }
    if (cause.status === 403 || cause.code === 'FORBIDDEN') {
      return 'forbidden';
    }
    if (cause.status === 429 || cause.code === 'RATE_LIMITED') {
      return 'rateLimited';
    }
  }
  return 'generic';
}

export function periodWindow(
  period: ChartPeriod,
  now = Date.now(),
): { from: string; to: string; limit: number } {
  const spans: Record<ChartPeriod, { ms: number; limit: number }> = {
    '1h': { ms: 60 * 60 * 1000, limit: 60 },
    '6h': { ms: 6 * 60 * 60 * 1000, limit: 72 },
    '24h': { ms: 24 * 60 * 60 * 1000, limit: 96 },
    '7d': { ms: 7 * 24 * 60 * 60 * 1000, limit: 168 },
  };
  const span = spans[period];
  return {
    from: new Date(now - span.ms).toISOString(),
    to: new Date(now).toISOString(),
    limit: span.limit,
  };
}

export function selectChartTicks(timestamps: string[], compact: boolean): string[] {
  if (timestamps.length === 0) {
    return [];
  }
  const count = compact ? 3 : 5;
  if (timestamps.length <= count) {
    return timestamps;
  }
  const last = timestamps[timestamps.length - 1];
  if (!last) {
    return [];
  }
  const lastIndex = timestamps.length - 1;
  return Array.from({ length: count }, (_, index) => {
    const position = Math.round((index / (count - 1)) * lastIndex);
    return timestamps[position] ?? last;
  });
}
