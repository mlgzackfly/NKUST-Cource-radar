import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

interface InstructorWithCourses {
  id: string;
  name: string;
  createdAt: Date;
  _count: { courses: number };
  courses: Array<{
    course: {
      id: string;
      _count: { reviews: number };
    };
  }>;
}

/**
 * GET /api/admin/instructors
 * 管理員專用：取得教師列表與統計資訊
 *
 * Query Parameters:
 * - page: 頁碼 (預設 1)
 * - limit: 每頁數量 (預設 20，最大 100)
 * - search: 搜尋教師姓名
 * - sortBy: 排序欄位 (reviewCount, avgRating, name) 預設 reviewCount
 * - sortOrder: 排序方向 (asc, desc) 預設 desc
 */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!prisma) {
      return Response.json({ error: "Database not available" }, { status: 503 });
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
    const search = url.searchParams.get("search") || "";
    const sortBy = url.searchParams.get("sortBy") || "reviewCount";
    const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    // 建立查詢條件
    const where = search
      ? {
          name: {
            contains: search,
            mode: "insensitive" as const,
          },
        }
      : {};

    // 取得總數
    const total = await prisma.instructor.count({ where });

    // 取得教師列表
    const instructors = await prisma.instructor.findMany({
      where,
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            courses: true,
          },
        },
        courses: {
          select: {
            course: {
              select: {
                id: true,
                _count: {
                  select: {
                    reviews: {
                      where: { status: "ACTIVE" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: sortBy === "name" ? { name: sortOrder } : undefined,
    });

    // 計算每位教師的統計資料
    const instructorsWithStats = await Promise.all(
      (instructors as InstructorWithCourses[]).map(async (instructor: InstructorWithCourses) => {
        const courseIds = instructor.courses.map((c: InstructorWithCourses["courses"][0]) => c.course.id);
        const reviewCount = instructor.courses.reduce(
          (sum: number, c: InstructorWithCourses["courses"][0]) => sum + c.course._count.reviews,
          0
        );

        // 取得平均評分
        let avgRating = null;
        if (courseIds.length > 0) {
          const avgStats = await prisma!.review.aggregate({
            where: {
              courseId: { in: courseIds },
              status: "ACTIVE",
            },
            _avg: {
              coolness: true,
              usefulness: true,
              workload: true,
              attendance: true,
              grading: true,
            },
          });

          const ratings = [
            avgStats._avg.coolness,
            avgStats._avg.usefulness,
            avgStats._avg.workload,
            avgStats._avg.attendance,
            avgStats._avg.grading,
          ].filter((r): r is number => r !== null);

          if (ratings.length > 0) {
            avgRating =
              Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
          }
        }

        return {
          id: instructor.id,
          name: instructor.name,
          createdAt: instructor.createdAt,
          courseCount: instructor._count.courses,
          reviewCount,
          avgRating,
        };
      })
    );

    // 如果按 reviewCount 或 avgRating 排序，在應用層排序
    if (sortBy === "reviewCount") {
      instructorsWithStats.sort((a, b) =>
        sortOrder === "desc"
          ? b.reviewCount - a.reviewCount
          : a.reviewCount - b.reviewCount
      );
    } else if (sortBy === "avgRating") {
      instructorsWithStats.sort((a, b) => {
        const ratingA = a.avgRating ?? 0;
        const ratingB = b.avgRating ?? 0;
        return sortOrder === "desc" ? ratingB - ratingA : ratingA - ratingB;
      });
    }

    return Response.json({
      instructors: instructorsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to get admin instructors:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
