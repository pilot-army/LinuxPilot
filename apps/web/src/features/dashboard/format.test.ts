import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../../api/client';
import {
  formatActivityTime,
  formatBytes,
  formatBytesPair,
  formatCompactPercent,
  formatLastSeen,
  formatUpdatedAt,
  formatUptime,
  interpolate,
  minutesSince,
  periodWindow,
  toDashboardError,
} from './format';

describe('dashboard formatters', () => {
  it('formats compact percents and interpolates copy', () => {
    expect(formatCompactPercent(38.4)).toBe('38%');
    expect(formatCompactPercent(null)).toBe('—');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytesPair(1024, 2048)).toBe('1.0 KB / 2.0 KB');
    expect(interpolate('{percent}% of the total', { percent: 80 })).toBe('80% of the total');
    expect(
      formatUptime(90061, {
        days: '{days}d {hours}h',
        hours: '{hours}h {minutes}m',
        minutes: '{minutes} min',
        none: '—',
      }),
    ).toBe('1d 1h');
    expect(
      formatUptime(null, {
        days: '{days}d {hours}h',
        hours: '{hours}h {minutes}m',
        minutes: '{minutes} min',
        none: '—',
      }),
    ).toBe('—');
  });

  it('formats activity timestamps for both locales', () => {
    const iso = '2026-08-16T09:45:00.000Z';
    expect(formatActivityTime(iso, 'en')).toMatch(/16/);
    expect(formatActivityTime(iso, 'uk')).toMatch(/16/);
    expect(formatActivityTime('not-a-date', 'en')).toBe('—');
  });

  it('builds a deterministic period window', () => {
    const now = Date.parse('2026-08-16T12:00:00.000Z');
    const window = periodWindow('24h', now);
    expect(window.to).toBe('2026-08-16T12:00:00.000Z');
    expect(window.from).toBe('2026-08-15T12:00:00.000Z');
    expect(window.limit).toBe(96);
  });

  it('formats last-updated and last-seen labels from real timestamps', () => {
    const now = Date.parse('2026-08-16T12:00:00.000Z');
    const copy = {
      justNow: 'Updated just now',
      minutesAgo: 'Updated {count} min ago',
      never: 'Not updated yet',
    };
    expect(minutesSince('2026-08-16T11:36:00.000Z', now)).toBe(24);
    expect(formatUpdatedAt('2026-08-16T12:00:00.000Z', copy, now)).toBe('Updated just now');
    expect(formatUpdatedAt('2026-08-16T11:36:00.000Z', copy, now)).toBe('Updated 24 min ago');
    expect(formatUpdatedAt(null, copy, now)).toBe('Not updated yet');
    expect(
      formatLastSeen(
        null,
        { never: 'Never', justNow: 'Just now', minutesAgo: '{count} min ago' },
        now,
      ),
    ).toBe('Never');
  });

  it('maps API failures to safe dashboard errors', () => {
    expect(toDashboardError(new ApiRequestError(0, 'NETWORK_ERROR', 'down'))).toBe('network');
    expect(toDashboardError(new ApiRequestError(403, 'FORBIDDEN', 'no'))).toBe('forbidden');
    expect(toDashboardError(new ApiRequestError(429, 'RATE_LIMITED', 'slow'))).toBe('rateLimited');
    expect(toDashboardError(new Error('stack'))).toBe('generic');
  });
});
