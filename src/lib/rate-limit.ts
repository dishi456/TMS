// Simple fixed-window in-memory rate limiter. Keyed by an arbitrary string
// (e.g. `login:<ip>`). Not distributed — adequate for a single Passenger
// instance; swap for Redis if the app is ever horizontally scaled.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Returns { ok } and, when blocked, retryAfter seconds. Counts this call. */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();

  // Opportunistic cleanup so the map can't grow unbounded over a long uptime.
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }

  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= limit) return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  b.count++;
  return { ok: true, retryAfter: 0 };
}

/** Best-effort client IP from common proxy headers (cPanel/Passenger sets X-Forwarded-For). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
