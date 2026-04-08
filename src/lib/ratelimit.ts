/**
 * Rate limiter with graceful degradation.
 *
 * If `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are present in the
 * environment, this uses `@upstash/ratelimit` over Upstash Redis — durable
 * across function instances. Otherwise it falls back to an in-memory Map
 * scoped to the current function instance: works fine in dev and small
 * production loads, documented as "best effort" under serverless cold-start
 * + horizontal scaling.
 *
 * Usage:
 *   const ok = await rateLimit("auth", req, { limit: 5, windowSec: 60 });
 *   if (!ok.success) return new Response("Too many requests", { status: 429 });
 *
 * The `key` is the namespace (e.g. "auth", "messages", "general"); the
 * actual lookup key is `${namespace}:${ip}` (or `:${userId}` if available).
 */

type LimitOptions = { limit: number; windowSec: number };
type LimitResult = { success: boolean; remaining: number; resetAt: number };

// Lazy-init: try Upstash if env vars present; otherwise use in-memory
let upstashClient: unknown = null;
let upstashTried = false;
async function getUpstash() {
  if (upstashTried) return upstashClient;
  upstashTried = true;
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }
  try {
    // Dynamic import so the package is optional at install time
    const { Redis } = await import("@upstash/redis").catch(() => ({
      Redis: null,
    }));
    if (!Redis) return null;
    upstashClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    return upstashClient;
  } catch {
    return null;
  }
}

// In-memory fallback. Map<bucketKey, {count, resetAt}>
const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(
  bucketKey: string,
  opts: LimitOptions
): LimitResult {
  const now = Date.now();
  const windowMs = opts.windowSec * 1000;
  const existing = memoryBuckets.get(bucketKey);

  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowMs;
    memoryBuckets.set(bucketKey, { count: 1, resetAt });
    return { success: true, remaining: opts.limit - 1, resetAt };
  }

  if (existing.count >= opts.limit) {
    return { success: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  memoryBuckets.set(bucketKey, existing);
  return {
    success: true,
    remaining: opts.limit - existing.count,
    resetAt: existing.resetAt,
  };
}

// Periodic cleanup so memoryBuckets doesn't grow unbounded
let lastCleanup = 0;
function maybeCleanupMemory() {
  const now = Date.now();
  if (now - lastCleanup < 60000) return; // every 60s
  lastCleanup = now;
  for (const [k, v] of memoryBuckets.entries()) {
    if (v.resetAt < now) memoryBuckets.delete(k);
  }
}

export function getClientKey(req: Request, userId?: string): string {
  if (userId) return `u:${userId}`;
  const fwd =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "anon";
  // Take first IP if comma-separated
  return `ip:${fwd.split(",")[0].trim()}`;
}

export async function rateLimit(
  namespace: string,
  req: Request,
  opts: LimitOptions,
  userId?: string
): Promise<LimitResult> {
  maybeCleanupMemory();
  const bucketKey = `${namespace}:${getClientKey(req, userId)}`;

  const upstash = (await getUpstash()) as {
    incr: (key: string) => Promise<number>;
    expire: (key: string, sec: number) => Promise<unknown>;
    pttl: (key: string) => Promise<number>;
  } | null;

  if (upstash) {
    try {
      const count = await upstash.incr(bucketKey);
      if (count === 1) {
        await upstash.expire(bucketKey, opts.windowSec);
      }
      const ttl = await upstash.pttl(bucketKey);
      const resetAt = Date.now() + (ttl > 0 ? ttl : opts.windowSec * 1000);
      const success = count <= opts.limit;
      return { success, remaining: Math.max(0, opts.limit - count), resetAt };
    } catch {
      // Fall through to memory
    }
  }

  return memoryLimit(bucketKey, opts);
}

export function rateLimitHeaders(result: LimitResult, opts: LimitOptions) {
  return {
    "X-RateLimit-Limit": String(opts.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
