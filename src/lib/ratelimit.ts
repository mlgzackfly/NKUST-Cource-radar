import { redisRateLimiters } from "./redis";

/**
 * Rate Limiter 整合 Redis 和記憶體 fallback
 * - 優先使用 Redis (Upstash Ratelimit)
 * - Redis 不可用時自動降級到記憶體 limiter
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * 記憶體 based Rate Limiter (Fallback)
 */
class MemoryRateLimiter {
  private cache: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 每 5 分鐘清理過期記錄
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.resetTime) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 檢查是否超過速率限制
   */
  check(
    identifier: string,
    limit: number,
    windowMs: number
  ): { success: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.cache.get(identifier);

    if (!entry || now > entry.resetTime) {
      const resetTime = now + windowMs;
      this.cache.set(identifier, {
        count: 1,
        resetTime,
      });
      return {
        success: true,
        remaining: limit - 1,
        resetTime,
      };
    }

    if (entry.count >= limit) {
      return {
        success: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    entry.count++;
    return {
      success: true,
      remaining: limit - entry.count,
      resetTime: entry.resetTime,
    };
  }

  reset(identifier: string): void {
    this.cache.delete(identifier);
  }

  getSize(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// 記憶體 limiter 單例（作為 fallback）
const memoryRateLimiter = new MemoryRateLimiter();

/**
 * 統一的 Rate Limiter 介面
 * 自動選擇 Redis 或記憶體實作
 */
class UnifiedRateLimiter {
  /**
   * 檢查速率限制
   * @param identifier - 識別符（通常是 IP 或 user ID）
   * @param limit - 時間窗口內的最大請求數
   * @param windowMs - 時間窗口（毫秒）
   * @param type - 限制類型（用於 Redis）
   */
  async checkAsync(
    identifier: string,
    limit: number,
    windowMs: number,
    type?: keyof typeof redisRateLimiters
  ): Promise<{ success: boolean; remaining: number; resetTime: number }> {
    // 優先使用 Redis
    if (redisRateLimiters && type && redisRateLimiters[type]) {
      try {
        const result = await (redisRateLimiters[type] as any).limit(identifier);
        return {
          success: result.success,
          remaining: result.remaining,
          resetTime: result.reset,
        };
      } catch (error) {
        console.warn("Redis rate limiter failed, falling back to memory:", error);
        // Fallback to memory
      }
    }

    // Fallback: 使用記憶體 limiter
    return memoryRateLimiter.check(identifier, limit, windowMs);
  }

  /**
   * 同步檢查（僅使用記憶體 limiter）
   * 保留向後相容性
   */
  check(
    identifier: string,
    limit: number,
    windowMs: number
  ): { success: boolean; remaining: number; resetTime: number } {
    return memoryRateLimiter.check(identifier, limit, windowMs);
  }

  reset(identifier: string): void {
    memoryRateLimiter.reset(identifier);
  }

  getSize(): number {
    return memoryRateLimiter.getSize();
  }

  clear(): void {
    memoryRateLimiter.clear();
  }

  destroy(): void {
    memoryRateLimiter.destroy();
  }
}

// 全域單例
export const rateLimiter = new UnifiedRateLimiter();

/**
 * 預設的速率限制設定
 */
export const RATE_LIMITS = {
  // 一般 API 請求：每 IP 每分鐘 60 次
  api: {
    limit: 60,
    window: 60 * 1000, // 1 分鐘
  },
  // 認證相關：每 IP 每小時 5 次
  auth: {
    limit: 5,
    window: 60 * 60 * 1000, // 1 小時
  },
  // 發送郵件：每 email 每小時 3 次
  email: {
    limit: 3,
    window: 60 * 60 * 1000, // 1 小時
  },
  // 評論相關：每用戶每分鐘 10 次
  review: {
    limit: 10,
    window: 60 * 1000, // 1 分鐘
  },
  // 投票：每用戶每分鐘 20 次
  vote: {
    limit: 20,
    window: 60 * 1000, // 1 分鐘
  },
  // 檢舉：每用戶每小時 5 次
  report: {
    limit: 5,
    window: 60 * 60 * 1000, // 1 小時
  },
};

/**
 * 從 Request 取得客戶端 IP
 */
export function getClientIp(request: Request): string {
  // 優先使用 X-Forwarded-For（Zeabur/Vercel 等平台會設定）
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  // 備用：X-Real-IP
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // 預設值（本地開發）
  return "127.0.0.1";
}
