// @ts-expect-error - Next.js 15.5.9 type definition issue with NextRequest

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/db";

interface ComparisonRecord {
  id: string;
  createdAt: Date;
  courseIds: string[];
}

/**
 * GET /api/compare/history
 * 取得使用者的課程比較歷史
 *
 * Query params:
 * - page: 頁碼（預設 1）
 * - limit: 每頁筆數（預設 10，最多 50）
 *
 * Response: { history: Array<ComparisonWithCourses>, pagination }
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 驗證 @nkust.edu.tw email
    if (!session.user.email.toLowerCase().endsWith("@nkust.edu.tw")) {
      return Response.json({ error: "Only @nkust.edu.tw emails allowed" }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const skip = (page - 1) * limit;

    // 找到使用者
    const user = await prisma!.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // 取得比較歷史
    const [history, total] = await Promise.all([
      prisma!.comparisonHistory.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma!.comparisonHistory.count({
        where: { userId: user.id },
      }),
    ]);

    // 取得每個比較的課程資訊
    const historyWithCourses = await Promise.all(
      history.map(async (comparison: ComparisonRecord) => {
        const courses = await prisma!.course.findMany({
          where: {
            id: {
              in: comparison.courseIds,
            },
          },
          select: {
            id: true,
            courseName: true,
            courseCode: true,
            department: true,
            instructors: {
              include: {
                instructor: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        return {
          id: comparison.id,
          createdAt: comparison.createdAt,
          courses,
        };
      })
    );

    return Response.json({
      history: historyWithCourses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to get comparison history:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
