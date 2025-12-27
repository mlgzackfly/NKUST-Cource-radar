import { prisma } from "./db";

/**
 * 推薦演算法核心
 *
 * 結合四種推薦策略：
 * 1. 協同過濾（Collaborative Filtering）- 40%
 * 2. 內容相似度（Content-Based）- 40%
 * 3. 熱門課程（Trending）- 20%
 * 4. 個人化偏好（Personalized）- 融入上述計算
 */

export type RecommendationType = "COLLABORATIVE" | "CONTENT" | "TRENDING" | "PERSONALIZED";

export interface RecommendationResult {
  courseId: string;
  score: number;
  reason: RecommendationType;
}

/**
 * 協同過濾：「修過 A 課程的人也修了 B 課程」
 */
export async function getCollaborativeRecommendations(
  userId: string,
  limit: number = 10
): Promise<RecommendationResult[]> {
  if (!prisma) return [];

  try {
    // 1. 取得使用者互動過的課程
    const userInteractions = await prisma.userInteraction.findMany({
      where: { userId },
      select: { courseId: true },
      distinct: ["courseId"],
      orderBy: { createdAt: "desc" },
      take: 50, // 取最近 50 個互動
    });

    if (userInteractions.length === 0) return [];

    const userCourseIds = userInteractions.map((i) => i.courseId);

    // 2. 找出與這些課程有互動的其他使用者（相似使用者）
    const similarUsers = await prisma.userInteraction.findMany({
      where: {
        courseId: { in: userCourseIds },
        userId: { not: userId },
      },
      select: { userId: true },
      distinct: ["userId"],
      take: 50, // 取前 50 個相似使用者
    });

    if (similarUsers.length === 0) return [];

    const similarUserIds = similarUsers.map((u) => u.userId);

    // 3. 找出相似使用者喜歡但當前使用者未接觸的課程
    const recommendations = await prisma.userInteraction.groupBy({
      by: ["courseId"],
      where: {
        userId: { in: similarUserIds },
        courseId: { notIn: userCourseIds },
      },
      _count: { userId: true },
      orderBy: { _count: { userId: "desc" } },
      take: limit,
    });

    return recommendations.map((rec, index) => ({
      courseId: rec.courseId,
      score: 1.0 - index * 0.05, // 遞減評分
      reason: "COLLABORATIVE" as RecommendationType,
    }));
  } catch (error) {
    console.error("Collaborative filtering error:", error);
    return [];
  }
}

/**
 * 內容相似度：推薦相似的課程
 */
export async function getContentBasedRecommendations(
  userId: string,
  limit: number = 10
): Promise<RecommendationResult[]> {
  if (!prisma) return [];

  try {
    // 1. 取得使用者評價過或收藏的課程
    const [userReviews, userFavorites] = await Promise.all([
      prisma.review.findMany({
        where: {
          userId,
          status: "ACTIVE",
          coolness: { gte: 4 }, // 只取高分評價
        },
        select: { courseId: true },
        take: 20,
      }),
      prisma.favorite.findMany({
        where: { userId },
        select: { courseId: true },
        take: 20,
      }),
    ]);

    const likedCourseIds = [
      ...userReviews.map((r) => r.courseId),
      ...userFavorites.map((f) => f.courseId),
    ];

    if (likedCourseIds.length === 0) return [];

    // 2. 取得這些課程的詳細資訊
    const likedCourses = await prisma.course.findMany({
      where: { id: { in: likedCourseIds } },
      select: {
        id: true,
        department: true,
        instructors: { select: { instructorId: true } },
        tags: { select: { tagId: true } },
      },
    });

    // 3. 建立相似度權重
    const departments = likedCourses.map((c) => c.department).filter(Boolean);
    const instructorIds = likedCourses.flatMap((c) =>
      c.instructors.map((i) => i.instructorId)
    );
    const tagIds = likedCourses.flatMap((c) => c.tags.map((t) => t.tagId));

    // 4. 找出相似課程（未接觸過的）
    const similarCourses = await prisma.course.findMany({
      where: {
        id: { notIn: likedCourseIds },
        OR: [
          { department: { in: departments } },
          {
            instructors: {
              some: { instructorId: { in: instructorIds } },
            },
          },
          {
            tags: {
              some: { tagId: { in: tagIds } },
            },
          },
        ],
      },
      select: {
        id: true,
        department: true,
        instructors: { select: { instructorId: true } },
        tags: { select: { tagId: true } },
      },
      take: limit * 2, // 多取一些，後續計算相似度後再排序
    });

    // 5. 計算相似度分數
    const scoredCourses = similarCourses.map((course) => {
      let score = 0;

      // 同系所：+0.3
      if (course.department && departments.includes(course.department)) {
        score += 0.3;
      }

      // 同教師：+0.4
      const courseInstructorIds = course.instructors.map((i) => i.instructorId);
      const commonInstructors = courseInstructorIds.filter((id) =>
        instructorIds.includes(id)
      );
      if (commonInstructors.length > 0) {
        score += 0.4;
      }

      // 相同標籤：每個 +0.2（最多 +0.6）
      const courseTagIds = course.tags.map((t) => t.tagId);
      const commonTags = courseTagIds.filter((id) => tagIds.includes(id));
      score += Math.min(commonTags.length * 0.2, 0.6);

      return {
        courseId: course.id,
        score,
        reason: "CONTENT" as RecommendationType,
      };
    });

    // 6. 排序並限制數量
    return scoredCourses
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    console.error("Content-based filtering error:", error);
    return [];
  }
}

/**
 * 熱門課程：推薦高評分且評論數多的課程
 * 使用類似 IMDb Top 250 的公式
 */
export async function getTrendingRecommendations(
  userId: string,
  limit: number = 10
): Promise<RecommendationResult[]> {
  if (!prisma) return [];

  try {
    // 1. 取得使用者已接觸的課程
    const userInteractions = await prisma.userInteraction.findMany({
      where: { userId },
      select: { courseId: true },
      distinct: ["courseId"],
    });

    const excludeCourseIds = userInteractions.map((i) => i.courseId);

    // 2. 取得全站平均評分
    const globalAvg = await prisma.review.aggregate({
      where: { status: "ACTIVE", coolness: { not: null } },
      _avg: { coolness: true },
    });

    const C = globalAvg._avg.coolness || 3.0; // 全站平均評分
    const m = 5; // 最低評論數閾值

    // 3. 計算每門課程的加權評分
    const courses = await prisma.course.findMany({
      where: {
        id: { notIn: excludeCourseIds },
        reviews: {
          some: {
            status: "ACTIVE",
            coolness: { not: null },
          },
        },
      },
      select: {
        id: true,
        reviews: {
          where: { status: "ACTIVE", coolness: { not: null } },
          select: { coolness: true },
        },
      },
      take: 100, // 先取 100 門，再排序
    });

    const scoredCourses = courses.map((course) => {
      const v = course.reviews.length; // 評論數
      const R =
        course.reviews.reduce((sum, r) => sum + (r.coolness || 0), 0) / v; // 平均評分

      // IMDb 公式：Score = (v / (v + m)) * R + (m / (v + m)) * C
      const score = (v / (v + m)) * R + (m / (v + m)) * C;

      return {
        courseId: course.id,
        score: score / 5.0, // 正規化到 0-1
        reason: "TRENDING" as RecommendationType,
      };
    });

    // 4. 排序並限制數量
    return scoredCourses.sort((a, b) => b.score - a.score).slice(0, limit);
  } catch (error) {
    console.error("Trending recommendations error:", error);
    return [];
  }
}

/**
 * 個人化偏好：根據使用者過往評論的偏好推薦
 */
export async function getPersonalizedRecommendations(
  userId: string,
  limit: number = 10
): Promise<RecommendationResult[]> {
  if (!prisma) return [];

  try {
    // 1. 分析使用者偏好
    const userReviews = await prisma.review.findMany({
      where: {
        userId,
        status: "ACTIVE",
      },
      select: {
        coolness: true,
        usefulness: true,
        grading: true,
      },
    });

    if (userReviews.length === 0) return [];

    // 計算平均偏好
    const avgCoolness =
      userReviews.reduce((sum, r) => sum + (r.coolness || 0), 0) /
      userReviews.length;
    const avgUsefulness =
      userReviews.reduce((sum, r) => sum + (r.usefulness || 0), 0) /
      userReviews.length;
    const avgGrading =
      userReviews.reduce((sum, r) => sum + (r.grading || 0), 0) /
      userReviews.length;

    // 2. 判斷偏好類型
    const prefersCool = avgCoolness >= 4; // 喜歡涼課
    const prefersUseful = avgUsefulness >= 4; // 喜歡實用課程
    const prefersSweet = avgGrading >= 4; // 喜歡甜課

    // 3. 取得使用者已接觸的課程
    const userInteractions = await prisma.userInteraction.findMany({
      where: { userId },
      select: { courseId: true },
      distinct: ["courseId"],
    });

    const excludeCourseIds = userInteractions.map((i) => i.courseId);

    // 4. 根據偏好找課程
    const courses = await prisma.course.findMany({
      where: {
        id: { notIn: excludeCourseIds },
        reviews: {
          some: { status: "ACTIVE" },
        },
      },
      select: {
        id: true,
        reviews: {
          where: { status: "ACTIVE" },
          select: {
            coolness: true,
            usefulness: true,
            grading: true,
          },
        },
      },
      take: 100,
    });

    // 5. 計算匹配分數
    const scoredCourses = courses.map((course) => {
      const reviews = course.reviews;
      if (reviews.length === 0) {
        return { courseId: course.id, score: 0, reason: "PERSONALIZED" as RecommendationType };
      }

      const avgCourseCoolness =
        reviews.reduce((sum, r) => sum + (r.coolness || 0), 0) / reviews.length;
      const avgCourseUsefulness =
        reviews.reduce((sum, r) => sum + (r.usefulness || 0), 0) / reviews.length;
      const avgCourseGrading =
        reviews.reduce((sum, r) => sum + (r.grading || 0), 0) / reviews.length;

      let score = 0;
      if (prefersCool && avgCourseCoolness >= 4) score += 0.4;
      if (prefersUseful && avgCourseUsefulness >= 4) score += 0.3;
      if (prefersSweet && avgCourseGrading >= 4) score += 0.3;

      return {
        courseId: course.id,
        score,
        reason: "PERSONALIZED" as RecommendationType,
      };
    });

    // 6. 排序並限制數量
    return scoredCourses
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    console.error("Personalized recommendations error:", error);
    return [];
  }
}

/**
 * 綜合推薦：混合四種演算法
 */
export async function getHybridRecommendations(
  userId: string,
  limit: number = 20
): Promise<RecommendationResult[]> {
  try {
    // 並行執行四種演算法
    const [collaborative, contentBased, trending, personalized] =
      await Promise.all([
        getCollaborativeRecommendations(userId, 10),
        getContentBasedRecommendations(userId, 10),
        getTrendingRecommendations(userId, 10),
        getPersonalizedRecommendations(userId, 10),
      ]);

    // 合併結果並計算加權分數
    const courseScores = new Map<string, { score: number; reason: RecommendationType }>();

    // 協同過濾：40%
    collaborative.forEach((rec) => {
      const current = courseScores.get(rec.courseId);
      const weightedScore = rec.score * 0.4;
      if (!current || weightedScore > current.score) {
        courseScores.set(rec.courseId, {
          score: weightedScore,
          reason: rec.reason,
        });
      }
    });

    // 內容相似度：40%
    contentBased.forEach((rec) => {
      const current = courseScores.get(rec.courseId);
      const weightedScore = rec.score * 0.4;
      if (!current) {
        courseScores.set(rec.courseId, {
          score: weightedScore,
          reason: rec.reason,
        });
      } else {
        current.score += weightedScore;
      }
    });

    // 熱門課程：20%
    trending.forEach((rec) => {
      const current = courseScores.get(rec.courseId);
      const weightedScore = rec.score * 0.2;
      if (!current) {
        courseScores.set(rec.courseId, {
          score: weightedScore,
          reason: rec.reason,
        });
      } else {
        current.score += weightedScore;
      }
    });

    // 個人化偏好：融入計算（boost）
    personalized.forEach((rec) => {
      const current = courseScores.get(rec.courseId);
      if (current) {
        current.score *= 1 + rec.score * 0.2; // 最多 boost 20%
      }
    });

    // 轉換為陣列並排序
    const results: RecommendationResult[] = Array.from(
      courseScores.entries()
    ).map(([courseId, { score, reason }]) => ({
      courseId,
      score,
      reason,
    }));

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  } catch (error) {
    console.error("Hybrid recommendations error:", error);
    return [];
  }
}

/**
 * 冷啟動解決方案：新使用者推薦
 */
export async function getColdStartRecommendations(
  userEmail: string,
  limit: number = 20
): Promise<RecommendationResult[]> {
  if (!prisma) return [];

  try {
    // 1. 從 email 判斷系所（例如 C109193108 → 資工系）
    const emailPrefix = userEmail.split("@")[0];
    let department: string | null = null;

    // 簡單的系所判斷邏輯（可根據實際情況擴充）
    if (emailPrefix.startsWith("C1")) {
      department = "資訊工程系";
    } else if (emailPrefix.startsWith("E1")) {
      department = "電機工程系";
    } else if (emailPrefix.startsWith("M1")) {
      department = "機械工程系";
    }
    // ... 可以擴充更多系所

    // 2. 取得熱門課程
    const trending = await getTrendingRecommendations("", limit);

    // 3. 如果有判斷出系所，加入系所熱門課程
    if (department) {
      const deptCourses = await prisma.course.findMany({
        where: {
          department,
          reviews: {
            some: {
              status: "ACTIVE",
              coolness: { gte: 4 },
            },
          },
        },
        select: {
          id: true,
          reviews: {
            where: { status: "ACTIVE", coolness: { not: null } },
            select: { coolness: true },
          },
        },
        take: Math.floor(limit / 2),
      });

      const deptRecommendations = deptCourses.map((course, index) => ({
        courseId: course.id,
        score: 0.8 - index * 0.05,
        reason: "CONTENT" as RecommendationType,
      }));

      // 混合：50% 熱門 + 50% 系所相關
      return [...deptRecommendations, ...trending.slice(0, Math.floor(limit / 2))];
    }

    // 4. 無法判斷系所，只回傳熱門課程
    return trending;
  } catch (error) {
    console.error("Cold start recommendations error:", error);
    return [];
  }
}
