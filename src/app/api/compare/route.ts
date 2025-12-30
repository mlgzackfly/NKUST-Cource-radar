// @ts-expect-error - Next.js 15.5.9 type definition issue with NextRequest

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

interface ReviewData {
  coolness: number | null;
  usefulness: number | null;
  workload: number | null;
  attendance: number | null;
  grading: number | null;
}

/**
 * POST /api/compare
 * 比較 2-4 門課程
 * - 公開：課程基本資訊、評論數
 * - 需登入：詳細評分（涼度、實用性、負擔、出席、給分）
 *
 * Request body: { courseIds: string[] }
 * Response: { courses: Array<CourseWithStats>, comparisonId: string, isAuthenticated: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    // 檢查是否登入（不強制要求）
    const user = await getCurrentUser();
    const isAuthenticated = !!user;

    const body = await request.json();
    const { courseIds } = body;

    // 驗證 courseIds
    if (!Array.isArray(courseIds) || courseIds.length < 2 || courseIds.length > 4) {
      return Response.json({ error: "Must compare between 2 and 4 courses" }, { status: 400 });
    }

    // 取得課程資料與統計
    const courses = await Promise.all(
      courseIds.map(async (courseId: string) => {
        const course = await prisma!.course.findUnique({
          where: { id: courseId },
          include: {
            instructors: {
              include: {
                instructor: true,
              },
            },
            tags: {
              include: {
                tag: true,
              },
              orderBy: {
                score: "desc",
              },
              take: 5,
            },
          },
        });

        if (!course) {
          return null;
        }

        // 計算評分統計
        const reviewCount = await prisma!.review.count({
          where: {
            courseId,
            status: "ACTIVE",
          },
        });

        // 基本統計（公開）
        const stats: {
          totalReviews: number;
          avgCoolness?: number;
          avgUsefulness?: number;
          avgWorkload?: number;
          avgAttendance?: number;
          avgGrading?: number;
        } = {
          totalReviews: reviewCount,
        };

        // 詳細評分統計（需登入）
        if (isAuthenticated && reviewCount > 0) {
          const reviews = await prisma!.review.findMany({
            where: {
              courseId,
              status: "ACTIVE",
            },
            select: {
              coolness: true,
              usefulness: true,
              workload: true,
              attendance: true,
              grading: true,
            },
          });

          const coolnessValues = reviews
            .map((r: ReviewData) => r.coolness)
            .filter((v: number | null): v is number => v !== null);
          const usefulnessValues = reviews
            .map((r: ReviewData) => r.usefulness)
            .filter((v: number | null): v is number => v !== null);
          const workloadValues = reviews
            .map((r: ReviewData) => r.workload)
            .filter((v: number | null): v is number => v !== null);
          const attendanceValues = reviews
            .map((r: ReviewData) => r.attendance)
            .filter((v: number | null): v is number => v !== null);
          const gradingValues = reviews
            .map((r: ReviewData) => r.grading)
            .filter((v: number | null): v is number => v !== null);

          stats.avgCoolness = coolnessValues.length > 0
            ? coolnessValues.reduce((a: number, b: number) => a + b, 0) / coolnessValues.length
            : 0;
          stats.avgUsefulness = usefulnessValues.length > 0
            ? usefulnessValues.reduce((a: number, b: number) => a + b, 0) / usefulnessValues.length
            : 0;
          stats.avgWorkload = workloadValues.length > 0
            ? workloadValues.reduce((a: number, b: number) => a + b, 0) / workloadValues.length
            : 0;
          stats.avgAttendance = attendanceValues.length > 0
            ? attendanceValues.reduce((a: number, b: number) => a + b, 0) / attendanceValues.length
            : 0;
          stats.avgGrading = gradingValues.length > 0
            ? gradingValues.reduce((a: number, b: number) => a + b, 0) / gradingValues.length
            : 0;
        }

        return {
          ...course,
          stats,
        };
      })
    );

    // 過濾掉不存在的課程
    const validCourses = courses.filter((c) => c !== null);

    if (validCourses.length < 2) {
      return Response.json({ error: "At least 2 valid courses required" }, { status: 400 });
    }

    // 如果有登入，儲存比較歷史
    let comparisonId = null;
    if (user) {
      const comparison = await prisma!.comparisonHistory.create({
        data: {
          userId: user.id,
          courseIds: validCourses.map((c) => c!.id),
        },
      });
      comparisonId = comparison.id;
    }

    return Response.json({
      courses: validCourses,
      comparisonId,
      isAuthenticated,
    });
  } catch (error) {
    console.error("Failed to compare courses:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
