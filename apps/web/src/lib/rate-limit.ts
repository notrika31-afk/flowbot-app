// apps/web/src/lib/rate-limit.ts

type BucketState = {
  tokens: number;
  lastRefill: number;
};

type RateLimitConfig = {
  key: string;      // מזהה (למשל: "ai-engine:IP")
  limit: number;    // כמה בקשות מותר
  windowMs: number; // פרק זמן במילישניות (למשל: 60 שניות)
};

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterMs?: number;
};

const buckets = new Map<string, BucketState>();

export function rateLimit(config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const { key, limit, windowMs } = config;

  const bucket = buckets.get(key) ?? {
    tokens: limit,
    lastRefill: now,
  };

  // ממלאים מחדש לפי הזמן שעבר
  const elapsed = now - bucket.lastRefill;
  if (elapsed > windowMs) {
    bucket.tokens = limit;
    bucket.lastRefill = now;
  }

  if (bucket.tokens <= 0) {
    const retryAfterMs = bucket.lastRefill + windowMs - now;
    buckets.set(key, bucket);
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: retryAfterMs > 0 ? retryAfterMs : 0,
    };
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);

  return {
    ok: true,
    remaining: bucket.tokens,
  };
}