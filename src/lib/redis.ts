import Redis from "ioredis";
import { Redis as UpstashRedis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

/**
 * Redis 連線設定
 * 支援兩種連線方式：
 * 1. Zeabur/標準 Redis (使用 REDIS_URL)
 * 2. Upstash Redis (使用 UPSTASH_REDIS_REST_URL)
 */

// 標準 Redis 客戶端 (ioredis)
let standardRedis: Redis | null = null;

// Upstash Redis 客戶端
let upstashRedis: UpstashRedis | null = null;

// 初始化 Redis 連線
if (process.env.REDIS_URL) {
  // 使用標準 Redis (Zeabur)
  try {
    const redisUrl = process.env.REDIS_URL;
    const useTLS = redisUrl.startsWith("rediss://") || process.env.REDIS_TLS === "true";

    standardRedis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      tls: useTLS
        ? {
            rejectUnauthorized: false, // Zeabur 使用自簽憑證
          }
        : undefined,
    });

    standardRedis.on("error", (err) => {
      console.error("Redis connection error:", err);
    });

    console.log("✓ Connected to standard Redis (Zeabur)");
  } catch (error) {
    console.error("Failed to connect to standard Redis:", error);
    standardRedis = null;
  }
} else if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  // 使用 Upstash Redis (REST API)
  try {
    upstashRedis = new UpstashRedis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    console.log("✓ Connected to Upstash Redis");
  } catch (error) {
    console.error("Failed to connect to Upstash Redis:", error);
    upstashRedis = null;
  }
}

/**
 * 統一的 Redis 介面
 * 自動選擇可用的 Redis 客戶端
 */
export const redis = standardRedis || upstashRedis;

/**
 * Redis Rate Limiters
 * 僅支援 Upstash Redis（使用其專屬的 Ratelimit）
 */
export const redisRateLimiters = upstashRedis
  ? {
      // API 通用限制：每分鐘 60 次
      api: new Ratelimit({
        redis: upstashRedis,
        limiter: Ratelimit.slidingWindow(60, "1 m"),
        analytics: true,
        prefix: "ratelimit:api",
      }),

      // 認證限制：每小時 5 次
      auth: new Ratelimit({
        redis: upstashRedis,
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        analytics: true,
        prefix: "ratelimit:auth",
      }),

      // 評論限制：每分鐘 10 次
      review: new Ratelimit({
        redis: upstashRedis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        analytics: true,
        prefix: "ratelimit:review",
      }),

      // 投票限制：每分鐘 20 次
      vote: new Ratelimit({
        redis: upstashRedis,
        limiter: Ratelimit.slidingWindow(20, "1 m"),
        analytics: true,
        prefix: "ratelimit:vote",
      }),

      // 檢舉限制：每小時 5 次
      report: new Ratelimit({
        redis: upstashRedis,
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        analytics: true,
        prefix: "ratelimit:report",
      }),

      // 留言限制：每分鐘 10 次
      comment: new Ratelimit({
        redis: upstashRedis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        analytics: true,
        prefix: "ratelimit:comment",
      }),

      // 收藏限制：每分鐘 10 次
      favorite: new Ratelimit({
        redis: upstashRedis,
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
    if (standardRedis) {
      await standardRedis.ping();
    } else if (upstashRedis) {
      await upstashRedis.ping();
    }
    return true;
  } catch (error) {
    console.error("Redis connection test failed:", error);
    return false;
  }
}

/**
 * 取得 Redis 客戶端類型
 */
export function getRedisType(): "standard" | "upstash" | null {
  if (standardRedis) return "standard";
  if (upstashRedis) return "upstash";
  return null;
}

/**
 * 標準 Redis 客戶端（用於快取）
 */
export const getStandardRedis = (): Redis | null => standardRedis;

/**
 * Upstash Redis 客戶端（用於 rate limiting）
 */
export const getUpstashRedis = (): UpstashRedis | null => upstashRedis;
