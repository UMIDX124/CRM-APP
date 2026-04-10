/**
 * Tests for the in-memory rate limiter fallback.
 * These test the memoryLimit logic directly without requiring Upstash.
 */

// Inline implementation matching src/lib/ratelimit.ts memoryLimit
const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

type LimitOptions = { limit: number; windowSec: number };
type LimitResult = { success: boolean; remaining: number; resetAt: number };

function memoryLimit(bucketKey: string, opts: LimitOptions): LimitResult {
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

beforeEach(() => {
  memoryBuckets.clear();
});

describe("In-memory rate limiter", () => {
  it("should allow requests under the limit", () => {
    const opts = { limit: 5, windowSec: 60 };
    const result = memoryLimit("test:ip:1.2.3.4", opts);

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("should decrement remaining on each call", () => {
    const opts = { limit: 3, windowSec: 60 };
    const key = "test:ip:1.2.3.4";

    const r1 = memoryLimit(key, opts);
    expect(r1.remaining).toBe(2);

    const r2 = memoryLimit(key, opts);
    expect(r2.remaining).toBe(1);

    const r3 = memoryLimit(key, opts);
    expect(r3.remaining).toBe(0);
    expect(r3.success).toBe(true);
  });

  it("should block requests at the limit", () => {
    const opts = { limit: 2, windowSec: 60 };
    const key = "test:ip:5.6.7.8";

    memoryLimit(key, opts); // 1
    memoryLimit(key, opts); // 2

    const blocked = memoryLimit(key, opts); // 3 — should be blocked
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("should track different IPs independently", () => {
    const opts = { limit: 1, windowSec: 60 };

    const r1 = memoryLimit("test:ip:1.1.1.1", opts);
    expect(r1.success).toBe(true);

    const r2 = memoryLimit("test:ip:2.2.2.2", opts);
    expect(r2.success).toBe(true);

    const r3 = memoryLimit("test:ip:1.1.1.1", opts);
    expect(r3.success).toBe(false);
  });

  it("should track different namespaces independently", () => {
    const opts = { limit: 1, windowSec: 60 };
    const ip = "ip:1.1.1.1";

    const r1 = memoryLimit(`auth:${ip}`, opts);
    expect(r1.success).toBe(true);

    const r2 = memoryLimit(`chat:${ip}`, opts);
    expect(r2.success).toBe(true);
  });

  it("should reset after window expires", () => {
    const opts = { limit: 1, windowSec: 1 }; // 1-second window
    const key = "test:ip:reset";

    const r1 = memoryLimit(key, opts);
    expect(r1.success).toBe(true);

    const r2 = memoryLimit(key, opts);
    expect(r2.success).toBe(false);

    // Simulate window expiry by manually adjusting resetAt
    const bucket = memoryBuckets.get(key)!;
    bucket.resetAt = Date.now() - 1;
    memoryBuckets.set(key, bucket);

    const r3 = memoryLimit(key, opts);
    expect(r3.success).toBe(true);
    expect(r3.remaining).toBe(0);
  });
});
