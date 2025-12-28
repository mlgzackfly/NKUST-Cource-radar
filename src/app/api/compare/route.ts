// @ts-expect-error - Next.js 15.5.9 type definition issue with NextRequest

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/db";

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
 *
 * Request body: { courseIds: string[] }
 * Response: { courses: Array<CourseWithStats>, comparisonId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 驗證 @nkust.edu.tw email
    if (!session.user.email.toLowerCase().endsWith("@nkust.edu.tw")) {
      return Response.json(
        { error: "Only @nkust.edu.tw emails allowed" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { courseIds } = body;

    // 驗證 courseIds
    if (!Array.isArray(courseIds) || courseIds.length < 2 || courseIds.length > 4) {
      return Response.json(
        { error: "Must compare between 2 and 4 courses" },
        { status: 400 }
      );
    }

    // 找到使用者
    const user = await prisma!.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
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

        const stats = {
          totalReviews: reviews.length,
          avgCoolness: 0,
          avgUsefulness: 0,
          avgWorkload: 0,
          avgAttendance: 0,
          avgGrading: 0,
        };

        if (reviews.length > 0) {
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

          if (coolnessValues.length > 0) {
            stats.avgCoolness =
              coolnessValues.reduce((a: number, b: number) => a + b, 0) / coolnessValues.length;
          }
          if (usefulnessValues.length > 0) {
            stats.avgUsefulness =
              usefulnessValues.reduce((a: number, b: number) => a + b, 0) /
              usefulnessValues.length;
          }
          if (workloadValues.length > 0) {
            stats.avgWorkload =
              workloadValues.reduce((a: number, b: number) => a + b, 0) / workloadValues.length;
          }
          if (attendanceValues.length > 0) {
            stats.avgAttendance =
              attendanceValues.reduce((a: number, b: number) => a + b, 0) /
              attendanceValues.length;
          }
          if (gradingValues.length > 0) {
            stats.avgGrading =
              gradingValues.reduce((a: number, b: number) => a + b, 0) / gradingValues.length;
          }
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
      return Response.json(
        { error: "At least 2 valid courses required" },
        { status: 400 }
      );
    }

    // 儲存比較歷史
    const comparison = await prisma!.comparisonHistory.create({
      data: {
        userId: user.id,
        courseIds: validCourses.map((c) => c!.id),
      },
    });

    return Response.json({
      courses: validCourses,
      comparisonId: comparison.id,
    });
  } catch (error) {
    console.error("Failed to compare courses:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
