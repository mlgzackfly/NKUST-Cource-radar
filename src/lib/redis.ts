import Redis, { RedisOptions } from "ioredis";
import { Redis as UpstashRedis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

/**
 * Redis 連線設定
 * 支援兩種連線方式：
 * 1. Zeabur/標準 Redis (使用 REDIS_URL)
 * 2. Upstash Redis (使用 UPSTASH_REDIS_REST_URL)
 *
 * Redis 是可選功能，連線失敗時會優雅降級
 */

// 標準 Redis 客戶端 (ioredis)
let standardRedis: Redis | null = null;

// Upstash Redis 客戶端
let upstashRedis: UpstashRedis | null = null;

// 追蹤連線狀態，避免重複打印錯誤
let redisErrorLogged = false;
let redisDisabled = false;

/**
 * 建立標準 Redis 連線
 * 使用 lazyConnect 避免啟動時阻塞，並限制重試次數
 */
function createStandardRedis(config: {
  host?: string;
  port?: number;
  password?: string;
  url?: string;
  useTLS?: boolean;
}): Redis | null {
  try {
    const options: RedisOptions = {
      maxRetriesPerRequest: 1, // 減少每個請求的重試次數
      enableOfflineQueue: false, // 離線時不排隊命令
      lazyConnect: true, // 延遲連線，不在初始化時連線
      retryStrategy(times: number) {
        // 最多重試 3 次，之後停止
        if (times > 3) {
          if (!redisErrorLogged) {
            console.warn("Redis: max retries reached, disabling Redis");
            redisErrorLogged = true;
            redisDisabled = true;
          }
          return null; // 停止重試
        }
        return Math.min(times * 100, 1000);
      },
      tls: config.useTLS
        ? {
            rejectUnauthorized: false, // Zeabur 使用自簽憑證
          }
        : undefined,
    };

    let client: Redis;

    if (config.url) {
      client = new Redis(config.url, options);
    } else {
      client = new Redis({
        ...options,
        host: config.host,
        port: config.port || 6379,
        password: config.password,
      });
    }

    // 只在第一次錯誤時打印，避免 log 洪水
    client.on("error", (err: Error & { code?: string }) => {
      if (!redisErrorLogged) {
        console.warn("Redis connection error (will retry silently):", err.message || err.code);
        redisErrorLogged = true;
      }
    });

    client.on("connect", () => {
      redisErrorLogged = false;
      redisDisabled = false;
      console.log("✓ Connected to standard Redis");
    });

    return client;
  } catch (error) {
    console.warn("Failed to create Redis client:", error);
    return null;
  }
}

// 初始化 Redis 連線
// 優先使用分離的環境變數（避免密碼中特殊字元的 URL 編碼問題）
if (process.env.REDIS_HOST && process.env.REDIS_PASSWORD) {
  standardRedis = createStandardRedis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
    useTLS: process.env.REDIS_TLS === "true",
  });
} else if (process.env.REDIS_URL) {
  // Fallback: 使用 REDIS_URL（密碼需要 URL 編碼）
  const redisUrl = process.env.REDIS_URL;
  standardRedis = createStandardRedis({
    url: redisUrl,
    useTLS: redisUrl.startsWith("rediss://") || process.env.REDIS_TLS === "true",
  });
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
 * 考慮連線狀態和是否被禁用
 */
export function isRedisAvailable(): boolean {
  if (redisDisabled) return false;
  return redis !== null;
}

/**
 * Redis 連線測試
 */
export async function testRedisConnection(): Promise<boolean> {
  if (!redis || redisDisabled) return false;

  try {
    if (standardRedis) {
      await standardRedis.ping();
    } else if (upstashRedis) {
      await upstashRedis.ping();
    }
    return true;
  } catch {
    // 連線測試失敗，靜默處理
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
