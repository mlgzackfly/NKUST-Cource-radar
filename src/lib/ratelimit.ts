/**
 * 簡單的記憶體 based Rate Limiter
 * 適合小型應用，不需要 Redis
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
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
   * @param identifier - 識別符（通常是 IP 或 user ID）
   * @param limit - 時間窗口內的最大請求數
   * @param windowMs - 時間窗口（毫秒）
   * @returns { success: boolean, remaining: number, resetTime: number }
   */
  check(
    identifier: string,
    limit: number,
    windowMs: number
  ): { success: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.cache.get(identifier);

    // 如果沒有記錄或已過期，建立新記錄
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

    // 如果超過限制
    if (entry.count >= limit) {
      return {
        success: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // 增加計數
    entry.count++;
    return {
      success: true,
      remaining: limit - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * 重置特定識別符的限制
   */
  reset(identifier: string): void {
    this.cache.delete(identifier);
  }

  /**
   * 取得目前快取大小（用於監控）
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * 清理所有記錄
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 停止清理定時器
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// 全域單例
const rateLimiter = new RateLimiter();

export default rateLimiter;

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
