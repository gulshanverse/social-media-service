export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };
type Entry = { count: number; resetAt: number };

const CLEANUP_INTERVAL_MS = 60_000;
const MAX_TRACKED_KEYS = 50_000;

export class SubmissionRateLimiter {
  private readonly entries = new Map<string, Entry>();
  private lastCleanupAt = 0;

  private cleanup(now: number) {
    if (now - this.lastCleanupAt < CLEANUP_INTERVAL_MS) return;
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }
    this.lastCleanupAt = now;
  }

  check(key: string, limit: number, windowSeconds: number, now = Date.now()): RateLimitResult {
    this.cleanup(now);
    const windowMs = Math.max(1, windowSeconds) * 1000;
    const current = this.entries.get(key);
    if (!current || current.resetAt <= now) {
      if (!current && this.entries.size >= MAX_TRACKED_KEYS) {
        let nextResetAt = now + windowMs;
        for (const entry of this.entries.values())
          nextResetAt = Math.min(nextResetAt, entry.resetAt);
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((nextResetAt - now) / 1000)),
        };
      }
      this.entries.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (current.count >= Math.max(1, limit)) {
      return { allowed: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
    }
    current.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }
}
