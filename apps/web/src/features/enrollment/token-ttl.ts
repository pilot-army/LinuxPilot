export type TokenTtl =
  | { expired: true }
  | { expired: false; unit: 'minutes' | 'seconds'; count: number };

export function tokenTtl(expiresAt: string | null | undefined, now = Date.now()): TokenTtl {
  if (!expiresAt) {
    return { expired: true };
  }
  const expires = Date.parse(expiresAt);
  if (Number.isNaN(expires) || expires <= now) {
    return { expired: true };
  }
  const remaining = expires - now;
  if (remaining < 60_000) {
    return { expired: false, unit: 'seconds', count: Math.max(1, Math.floor(remaining / 1000)) };
  }
  return { expired: false, unit: 'minutes', count: Math.floor(remaining / 60_000) };
}
