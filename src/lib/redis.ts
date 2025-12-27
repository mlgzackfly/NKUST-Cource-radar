import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

/**
 * Redis 連線設定
 * 支援 Upstash Redis (推薦) 或 fallback 到 null (使用記憶體 rate limiter)
 */
export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/**
 * Redis Rate Limiters
 * 使用 Upstash Ratelimit 提供分散式 rate limiting
 */
export const redisRateLimiters = redis
  ? {
      // API 通用限制：每分鐘 60 次
      api: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, "1 m"),
        analytics: true,
        prefix: "ratelimit:api",
      }),

      // 認證限制：每小時 5 次
      auth: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        analytics: true,
        prefix: "ratelimit:auth",
      }),

      // 評論限制：每分鐘 10 次
      review: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        analytics: true,
        prefix: "ratelimit:review",
      }),

      // 投票限制：每分鐘 20 次
      vote: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, "1 m"),
        analytics: true,
        prefix: "ratelimit:vote",
      }),

      // 檢舉限制：每小時 5 次
      report: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        analytics: true,
        prefix: "ratelimit:report",
      }),

      // 留言限制：每分鐘 10 次
      comment: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        analytics: true,
        prefix: "ratelimit:comment",
      }),

      // 收藏限制：每分鐘 10 次
      favorite: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        analytics: true,
        prefix: "ratelimit:favorite",
      }),
    }
  : null;

/**
 * 檢查 Redis 是否可用
 */
export function isRedisAvailable(): boolean {
  return redis !== null;
}

/**
 * Redis 連線測試
 */
export async function testRedisConnection(): Promise<boolean> {
  if (!redis) return false;

  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error("Redis connection test failed:", error);
    return false;
  }
}
