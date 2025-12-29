import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  getHybridRecommendations,
  getColdStartRecommendations,
  getCollaborativeRecommendations,
  getContentBasedRecommendations,
  getTrendingRecommendations,
  getPersonalizedRecommendations,
  type RecommendationType,
} from "@/lib/recommendation";

/**
 * GET /api/recommendations
 *
 * Query Parameters:
 * - type: all | collaborative | content | trending | personalized
 * - limit: 數量限制（預設 20）
 * - useCache: 是否使用快取（預設 true）
 */
export async function GET(request: Request): Promise<Response> {
  if (!prisma) {
    return Response.json({ error: "Database not available" }, { status: 503 });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";
    const limit = Math.min(Number(searchParams.get("limit") || "20"), 50);
    const useCache = searchParams.get("useCache") !== "false";

    // 1. 檢查快取
    if (useCache) {
      const cached = await prisma.recommendationCache.findMany({
        where: {
          userId: user.id,
          expiresAt: { gt: new Date() },
          ...(type !== "all" && { reason: type.toUpperCase() as RecommendationType }),
        },
        orderBy: { score: "desc" },
        take: limit,
        select: {
          courseId: true,
          score: true,
          reason: true,
          course: {
            select: {
              id: true,
              courseName: true,
              courseCode: true,
              department: true,
              campus: true,
              year: true,
              term: true,
              credits: true,
              instructors: {
                select: {
                  instructor: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      });

      if (cached.length > 0) {
        return Response.json({
          recommendations: cached.map((c: any) => ({
            ...c.course,
            score: c.score,
            reason: c.reason,
            instructors: c.course.instructors.map((i: any) => i.instructor),
          })),
          cached: true,
        });
      }
    }

    // 2. 計算推薦（根據 type）
    let results;

    // 檢查是否為新使用者（無互動記錄）
    const interactionCount = await prisma.userInteraction.count({
      where: { userId: user.id },
    });

    if (interactionCount === 0) {
      // 冷啟動：新使用者
      results = await getColdStartRecommendations(user.email, limit);
    } else {
      // 一般推薦
      switch (type) {
        case "collaborative":
          results = await getCollaborativeRecommendations(user.id, limit);
          break;
        case "content":
          results = await getContentBasedRecommendations(user.id, limit);
          break;
        case "trending":
          results = await getTrendingRecommendations(user.id, limit);
          break;
        case "personalized":
          results = await getPersonalizedRecommendations(user.id, limit);
          break;
        case "all":
        default:
          results = await getHybridRecommendations(user.id, limit);
          break;
      }
    }

    if (results.length === 0) {
      return Response.json({
        recommendations: [],
        cached: false,
      });
    }

    // 3. 取得課程詳細資訊
    const courseIds = results.map((r: any) => r.courseId);
    const courses = await prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: {
        id: true,
        courseName: true,
        courseCode: true,
        department: true,
        campus: true,
        year: true,
        term: true,
        credits: true,
        instructors: {
          select: {
            instructor: { select: { id: true, name: true } },
          },
        },
      },
    });

    // 建立 courseId -> course 映射
    const courseMap = new Map(courses.map((c: any) => [c.id, c]));

    // 4. 更新快取（異步，不等待）
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 小時後過期

    prisma.recommendationCache
      .createMany({
        data: results.map((r: any) => ({
          userId: user.id,
          courseId: r.courseId,
          score: r.score,
          reason: r.reason,
          expiresAt,
        })),
        skipDuplicates: true,
      })
      .catch((err: any) => console.error("Failed to cache recommendations:", err));

    // 5. 回傳結果
    const recommendations = results
      .map((r: any) => {
        const course: any = courseMap.get(r.courseId);
        if (!course) return null;

        return {
          ...course,
          score: r.score,
          reason: r.reason,
          instructors: course.instructors.map((i: any) => i.instructor),
        };
      })
      .filter((r: any) => r !== null);

    return Response.json({
      recommendations,
      cached: false,
    });
  } catch (error: any) {
    console.error("Recommendations API error:", error);
    return Response.json(
      { error: error.message || "Failed to get recommendations" },
      { status: 500 }
    );
  }
}
