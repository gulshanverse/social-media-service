export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };
type Entry = { count: number; resetAt: number };

export class SubmissionRateLimiter {
  private readonly entries = new Map<string, Entry>();

  check(key: string, limit: number, windowSeconds: number, now = Date.now()): RateLimitResult {
    const windowMs = Math.max(1, windowSeconds) * 1000;
    const current = this.entries.get(key);
    if (!current || current.resetAt <= now) {
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
