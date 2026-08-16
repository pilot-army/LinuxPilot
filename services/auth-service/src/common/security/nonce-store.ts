export class NonceStore {
  private readonly seen = new Map<string, number>();

  constructor(private readonly ttlMs: number) {}

  remember(nonce: string, now = Date.now()): boolean {
    this.prune(now);
    if (this.seen.has(nonce)) {
      return false;
    }
    this.seen.set(nonce, now + this.ttlMs);
    return true;
  }

  private prune(now: number): void {
    for (const [nonce, expiresAt] of this.seen) {
      if (expiresAt <= now) {
        this.seen.delete(nonce);
      }
    }
  }
}
