const DURATION_PATTERN = /^(\d+)([smhd])$/;

export function parseDurationToSeconds(ttl: string): number {
  const match = DURATION_PATTERN.exec(ttl.trim());
  if (!match) {
    throw new Error(`Invalid duration: ${ttl}`);
  }

  const value = Number(match[1]);
  const unit = match[2];
  if (unit === 's') return value;
  if (unit === 'm') return value * 60;
  if (unit === 'h') return value * 60 * 60;
  return value * 60 * 60 * 24;
}

export function parseDurationToMs(ttl: string): number {
  return parseDurationToSeconds(ttl) * 1000;
}

export function daysToMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

export function daysToSeconds(days: number): number {
  return days * 24 * 60 * 60;
}
