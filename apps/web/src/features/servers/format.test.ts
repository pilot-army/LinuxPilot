import { describe, expect, it } from 'vitest';
import { formatBytes, formatLastSeen, formatPercent, formatUptime, interpolate } from './format';

describe('server formatters', () => {
  it('formats bytes, percent, and uptime', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatPercent(12.34)).toBe('12.3%');
    expect(formatUptime(90000)).toBe('1d 1h');
    expect(interpolate('Page {page} of {pages}', { page: 2, pages: 5 })).toBe('Page 2 of 5');
  });

  it('formats last-seen labels without inventing a timestamp', () => {
    const copy = {
      never: 'Never',
      justNow: 'just now',
      secondsAgo: '{count}s ago',
      minutesAgo: '{count} min ago',
      hoursAgo: '{count}h ago',
      daysAgo: '{count}d ago',
    };
    const now = Date.parse('2026-08-16T12:00:00.000Z');
    expect(formatLastSeen(null, copy, now)).toBe('Never');
    expect(formatLastSeen('2026-08-16T11:59:55.000Z', copy, now)).toBe('just now');
    expect(formatLastSeen('2026-08-16T11:42:00.000Z', copy, now)).toBe('18 min ago');
  });
});
