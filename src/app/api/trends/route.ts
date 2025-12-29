// @ts-expect-error - Next.js 15.5.9 type definition issue with NextRequest

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCached, CACHE_TTL } from "@/lib/cache";

interface SemesterGroup {
  year: string;
  term: string;
}

interface DepartmentCount {
  department: string | null;
  _count: {
    id: number;
  };
}

interface InstructorWithCourses {
  id: string;
  name: string;
  courses: {
    course: {
      _count: {
        reviews: number;
      };
    };
  }[];
}

interface ReviewRecord {
  id: string;
  createdAt: Date;
  coolness: number | null;
  grading: number | null;
  course: {
    id: string;
    courseName: string;
    department: string | null;
  };
}

/**
 * GET /api/trends
 * 取得全站趨勢分析資料
 *
 * Query params:
 * - type: 趨勢類型（reviews | courses | ratings）
 * - period: 時間範圍（semester | month | week）
 * - limit: 限制筆數（預設 12）
 *
 * Response:
 * - overviewStats: 總覽統計
 * - trendData: 趨勢數據
 * - hotDepartments: 熱門系所
 * - hotInstructors: 熱門教師
 * - recentActivity: 近期活動
 */
export async function GET(request: NextRequest) {
  try {
    if (!prisma) {
      return Response.json({ error: "Database not available" }, { status: 503 });
    }

    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type") || "reviews";
    const period = searchParams.get("period") || "semester";
    const limit = Math.min(parseInt(searchParams.get("limit") || "12"), 24);

    const cacheKey = `trends:${type}:${period}:${limit}`;
    const trends = await getCached(cacheKey, CACHE_TTL.COURSE_SUMMARY, async () => {
      // 1. 總覽統計
      const [totalCourses, totalInstructors, totalReviews, totalUsers, activeCourses] =
        await Promise.all([
          prisma!.course.count(),
          prisma!.instructor.count(),
          prisma!.review.count({ where: { status: "ACTIVE" } }),
          prisma!.user.count(),
          prisma!.course.count({
            where: {
              reviews: {
                some: { status: "ACTIVE" },
              },
            },
          }),
        ]);

      const overviewStats = {
        totalCourses,
        totalInstructors,
        totalReviews,
        totalUsers,
        activeCourses,
        reviewRate: totalCourses > 0 ? (activeCourses / totalCourses) * 100 : 0,
      };

      // 2. 趨勢數據（按學期）
      let trendData: any[] = [];

      if (period === "semester") {
        // 取得所有有課程的學期
        const semesters = await prisma!.course.groupBy({
          by: ["year", "term"],
          orderBy: [{ year: "asc" }, { term: "asc" }],
          take: limit,
        });

        trendData = await Promise.all(
          semesters.map(async ({ year, term }: SemesterGroup) => {
            const semester = `${year}-${term}`;

            const [courseCount, reviewStats, avgRatings] = await Promise.all([
              prisma!.course.count({
                where: { year, term },
              }),
              prisma!.review.count({
                where: {
                  course: { year, term },
                  status: "ACTIVE",
                },
              }),
              prisma!.review.aggregate({
                where: {
                  course: { year, term },
                  status: "ACTIVE",
                },
                _avg: {
                  coolness: true,
                  usefulness: true,
                  workload: true,
                  attendance: true,
                  grading: true,
                },
              }),
            ]);

            return {
              semester,
              year,
              term,
              courseCount,
              reviewCount: reviewStats,
              avgRating: {
                coolness: avgRatings._avg.coolness || 0,
                usefulness: avgRatings._avg.usefulness || 0,
                workload: avgRatings._avg.workload || 0,
                attendance: avgRatings._avg.attendance || 0,
                grading: avgRatings._avg.grading || 0,
              },
            };
          })
        );
      } else if (period === "month") {
        // 按月份統計（最近 12 個月的評論）
        const now = new Date();
        const months: Date[] = [];
        for (let i = limit - 1; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push(date);
        }

        trendData = await Promise.all(
          months.map(async (monthStart) => {
            const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

            const reviewCount = await prisma!.review.count({
              where: {
                status: "ACTIVE",
                createdAt: {
                  gte: monthStart,
                  lte: monthEnd,
                },
              },
            });

            const avgRatings = await prisma!.review.aggregate({
              where: {
                status: "ACTIVE",
                createdAt: {
                  gte: monthStart,
                  lte: monthEnd,
                },
              },
              _avg: {
                coolness: true,
                usefulness: true,
                workload: true,
                attendance: true,
                grading: true,
              },
            });

            return {
              month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(
                2,
                "0"
              )}`,
              reviewCount,
              avgRating: {
                coolness: avgRatings._avg.coolness || 0,
                usefulness: avgRatings._avg.usefulness || 0,
                workload: avgRatings._avg.workload || 0,
                attendance: avgRatings._avg.attendance || 0,
                grading: avgRatings._avg.grading || 0,
              },
            };
          })
        );
      }

      // 3. 熱門系所（按評論數）
      const departmentReviews = await prisma!.review.groupBy({
        by: [],
        where: { status: "ACTIVE" },
        _count: { id: true },
      });

      const departmentsWithCounts = await prisma!.course.groupBy({
        by: ["department"],
        where: {
          department: { not: null },
          reviews: {
            some: { status: "ACTIVE" },
          },
        },
        _count: {
          id: true,
        },
      });

      const hotDepartments = await Promise.all(
        departmentsWithCounts
          .filter((d: any) => d.department)
          .slice(0, 10)
          .map(async (dept: any) => {
            const reviewCount = await prisma!.review.count({
              where: {
                course: { department: dept.department },
                status: "ACTIVE",
              },
            });

            const avgRatings = await prisma!.review.aggregate({
              where: {
                course: { department: dept.department },
                status: "ACTIVE",
              },
              _avg: {
                coolness: true,
                usefulness: true,
                grading: true,
              },
            });

            return {
              department: dept.department,
              courseCount: dept._count.id,
              reviewCount,
              avgCoolness: avgRatings._avg.coolness || 0,
              avgGrading: avgRatings._avg.grading || 0,
            };
          })
      );

      // 按評論數排序
      hotDepartments.sort((a, b) => b.reviewCount - a.reviewCount);

      // 4. 熱門教師（按評論數）
      const instructorsWithCounts = await prisma!.instructor.findMany({
        select: {
          id: true,
          name: true,
          courses: {
            select: {
              course: {
                select: {
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
      });

      const instructorStats = instructorsWithCounts.map((instructor: any) => ({
        id: instructor.id,
        name: instructor.name,
        reviewCount: instructor.courses.reduce(
          (sum: number, ci: any) => sum + ci.course._count.reviews,
          0
        ),
      }));

      const topInstructors = instructorStats
        .sort((a: any, b: any) => b.reviewCount - a.reviewCount)
        .slice(0, 10);

      const hotInstructors = await Promise.all(
        topInstructors.map(async (instructor: any) => {
          const avgRatings = await prisma!.review.aggregate({
            where: {
              course: {
                instructors: {
                  some: { instructorId: instructor.id },
                },
              },
              status: "ACTIVE",
            },
            _avg: {
              coolness: true,
              usefulness: true,
              grading: true,
            },
          });

          return {
            id: instructor.id,
            name: instructor.name,
            reviewCount: instructor.reviewCount,
            avgCoolness: avgRatings._avg.coolness || 0,
            avgGrading: avgRatings._avg.grading || 0,
          };
        })
      );

      // 5. 近期活動（最近的評論）
      const recentReviews = await prisma!.review.findMany({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          createdAt: true,
          coolness: true,
          grading: true,
          course: {
            select: {
              id: true,
              courseName: true,
              department: true,
            },
          },
        },
      });

      const recentActivity = recentReviews.map((review: any) => ({
        type: "review",
        id: review.id,
        createdAt: review.createdAt,
        courseName: review.course.courseName,
        courseId: review.course.id,
        department: review.course.department,
        coolness: review.coolness,
        grading: review.grading,
      }));

      return {
        overviewStats,
        trendData,
        hotDepartments: hotDepartments.slice(0, 10),
        hotInstructors,
        recentActivity,
      };
    });

    return Response.json(trends);
  } catch (error: any) {
    console.error("Failed to get trends:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
