import { redis } from "./redis";

/**
 * 快取過期時間設定 (秒)
 */
export const CACHE_TTL = {
  COURSE_SUMMARY: 60 * 60, // 1 小時
  COURSE_LIST: 60 * 5, // 5 分鐘
  RECOMMENDATIONS: 60 * 60 * 24, // 24 小時
  INSTRUCTOR_STATS: 60 * 60 * 12, // 12 小時
  DEPARTMENT_STATS: 60 * 60 * 12, // 12 小時
  SEARCH_RESULTS: 60 * 5, // 5 分鐘
  FILTERS: 60 * 60, // 1 小時
};

/**
 * 取得快取資料，若快取不存在則執行 fetchFn 並快取結果
 *
 * @param key 快取鍵值
 * @param ttl 過期時間（秒）
 * @param fetchFn 取得資料的函數
 * @returns 資料
 */
export async function getCached<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // 若 Redis 不可用，直接執行 fetchFn
  if (!redis) {
    return fetchFn();
  }

  try {
    // 嘗試從快取取得資料
    const cached = await redis.get<string>(key);

    if (cached) {
      // 快取命中，解析並回傳
      return JSON.parse(cached) as T;
    }

    // 快取未命中，執行 fetchFn
    const data = await fetchFn();

    // 將資料存入快取
    await redis.setex(key, ttl, JSON.stringify(data));

    return data;
  } catch (error) {
    console.error("Cache error:", error);
    // 快取錯誤時 fallback 到直接執行 fetchFn
    return fetchFn();
  }
}

/**
 * 設定快取
 *
 * @param key 快取鍵值
 * @param value 要快取的資料
 * @param ttl 過期時間（秒）
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttl: number
): Promise<void> {
  if (!redis) return;

  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error("Error setting cache:", error);
  }
}

/**
 * 刪除快取
 *
 * @param key 快取鍵值
 */
export async function deleteCache(key: string): Promise<void> {
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (error) {
    console.error("Error deleting cache:", error);
  }
}

/**
 * 批次刪除快取（使用 pattern 匹配）
 *
 * 注意：Upstash Redis 不支援 KEYS 命令，因此需要手動維護 key 列表
 * 建議使用具體的 key 而非 pattern
 *
 * @param keys 要刪除的快取鍵值陣列
 */
export async function deleteCacheBatch(keys: string[]): Promise<void> {
  if (!redis || keys.length === 0) return;

  try {
    await redis.del(...keys);
  } catch (error) {
    console.error("Error batch deleting cache:", error);
  }
}

/**
 * 清除課程相關的快取
 *
 * @param courseId 課程 ID
 */
export async function invalidateCourseCaches(courseId: string): Promise<void> {
  const keys = [
    `course:${courseId}:summary`,
    `course:${courseId}:reviews`,
    `course:${courseId}:details`,
  ];

  await deleteCacheBatch(keys);
}

/**
 * 清除使用者相關的快取
 *
 * @param userId 使用者 ID
 */
export async function invalidateUserCaches(userId: string): Promise<void> {
  const keys = [
    `user:${userId}:recommendations`,
    `user:${userId}:favorites`,
  ];

  await deleteCacheBatch(keys);
}

/**
 * 快取鍵值產生器
 */
export const cacheKeys = {
  courseSummary: (courseId: string) => `course:${courseId}:summary`,
  courseReviews: (courseId: string, sort: string) => `course:${courseId}:reviews:${sort}`,
  courseDetails: (courseId: string) => `course:${courseId}:details`,
  courseList: (params: Record<string, any>) =>
    `courses:${JSON.stringify(params)}`,
  instructorStats: (instructorId: string) => `instructor:${instructorId}:stats`,
  departmentStats: (department: string) => `department:${department}:stats`,
  userRecommendations: (userId: string, type: string) =>
    `user:${userId}:recommendations:${type}`,
  userFavorites: (userId: string) => `user:${userId}:favorites`,
  searchSuggestions: (query: string) => `search:suggestions:${query}`,
  filters: () => `filters:options`,
};
