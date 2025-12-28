// @ts-expect-error - Next.js 15.5.9 type definition issue with NextRequest

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCached, CACHE_TTL } from "@/lib/cache";

/**
 * GET /api/instructors/[id]/stats
 * 取得教師的詳細統計資料（用於圖表展示）
 *
 * Response:
 * - semesterTrends: 按學期的評分趨勢
 * - ratingDistribution: 各評分項目的分佈
 * - topCourses: 熱門課程（按評論數排序）
 * - comparison: 與全校平均的比較
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!prisma) {
      return Response.json(
        { error: "Database not available" },
        { status: 503 }
      );
    }

    // 使用 cache 提升效能
    const cacheKey = `instructor_stats:${id}`;
    const stats = await getCached(cacheKey, CACHE_TTL.INSTRUCTOR_STATS, async () => {
      // 驗證教師存在
      const instructor = await prisma!.instructor.findUnique({
        where: { id },
        select: { id: true, name: true },
      });

      if (!instructor) {
        throw new Error("Instructor not found");
      }

      // 1. 按學期的評分趨勢
      const coursesBySemester = await prisma!.course.findMany({
        where: {
          instructors: {
            some: { instructorId: id },
          },
        },
        select: {
          id: true,
          year: true,
          term: true,
          courseName: true,
        },
        orderBy: [{ year: "asc" }, { term: "asc" }],
      });

      const semesterMap = new Map<string, { courseIds: string[]; semester: string }>();
      for (const course of coursesBySemester) {
        const semester = `${course.year}-${course.term}`;
        if (!semesterMap.has(semester)) {
          semesterMap.set(semester, { courseIds: [], semester });
        }
        semesterMap.get(semester)!.courseIds.push(course.id);
      }

      const semesterTrends = await Promise.all(
        Array.from(semesterMap.values()).map(async ({ courseIds, semester }) => {
          const reviews = await prisma!.review.findMany({
            where: {
              courseId: { in: courseIds },
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

          const count = reviews.length;
          if (count === 0) {
            return {
              semester,
              count: 0,
              avgCoolness: 0,
              avgUsefulness: 0,
              avgWorkload: 0,
              avgAttendance: 0,
              avgGrading: 0,
            };
          }

          const sum = {
            coolness: 0,
            usefulness: 0,
            workload: 0,
            attendance: 0,
            grading: 0,
            coolnessCount: 0,
            usefulnessCount: 0,
            workloadCount: 0,
            attendanceCount: 0,
            gradingCount: 0,
          };

          for (const r of reviews) {
            if (r.coolness !== null) {
              sum.coolness += r.coolness;
              sum.coolnessCount++;
            }
            if (r.usefulness !== null) {
              sum.usefulness += r.usefulness;
              sum.usefulnessCount++;
            }
            if (r.workload !== null) {
              sum.workload += r.workload;
              sum.workloadCount++;
            }
            if (r.attendance !== null) {
              sum.attendance += r.attendance;
              sum.attendanceCount++;
            }
            if (r.grading !== null) {
              sum.grading += r.grading;
              sum.gradingCount++;
            }
          }

          return {
            semester,
            count,
            avgCoolness: sum.coolnessCount > 0 ? sum.coolness / sum.coolnessCount : 0,
            avgUsefulness:
              sum.usefulnessCount > 0 ? sum.usefulness / sum.usefulnessCount : 0,
            avgWorkload: sum.workloadCount > 0 ? sum.workload / sum.workloadCount : 0,
            avgAttendance:
              sum.attendanceCount > 0 ? sum.attendance / sum.attendanceCount : 0,
            avgGrading: sum.gradingCount > 0 ? sum.grading / sum.gradingCount : 0,
          };
        })
      );

      // 2. 評分分佈（1-5 星的分佈）
      const allReviews = await prisma!.review.findMany({
        where: {
          course: {
            instructors: {
              some: { instructorId: id },
            },
          },
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

      const distribution = {
        coolness: [0, 0, 0, 0, 0], // 1-5 stars
        usefulness: [0, 0, 0, 0, 0],
        workload: [0, 0, 0, 0, 0],
        attendance: [0, 0, 0, 0, 0],
        grading: [0, 0, 0, 0, 0],
      };

      for (const r of allReviews) {
        if (r.coolness !== null && r.coolness >= 1 && r.coolness <= 5) {
          distribution.coolness[r.coolness - 1]++;
        }
        if (r.usefulness !== null && r.usefulness >= 1 && r.usefulness <= 5) {
          distribution.usefulness[r.usefulness - 1]++;
        }
        if (r.workload !== null && r.workload >= 1 && r.workload <= 5) {
          distribution.workload[r.workload - 1]++;
        }
        if (r.attendance !== null && r.attendance >= 1 && r.attendance <= 5) {
          distribution.attendance[r.attendance - 1]++;
        }
        if (r.grading !== null && r.grading >= 1 && r.grading <= 5) {
          distribution.grading[r.grading - 1]++;
        }
      }

      // 3. 熱門課程（按評論數排序）
      const coursesWithReviewCount = await prisma!.course.findMany({
        where: {
          instructors: {
            some: { instructorId: id },
          },
        },
        select: {
          id: true,
          courseName: true,
          courseCode: true,
          year: true,
          term: true,
          _count: {
            select: {
              reviews: {
                where: { status: "ACTIVE" },
              },
            },
          },
        },
        orderBy: {
          reviews: {
            _count: "desc",
          },
        },
        take: 10,
      });

      const topCourses = await Promise.all(
        coursesWithReviewCount.map(async (course: any) => {
          const avgStats = await prisma!.review.aggregate({
            where: {
              courseId: course.id,
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

          return {
            id: course.id,
            name: course.courseName,
            code: course.courseCode,
            semester: `${course.year}-${course.term}`,
            reviewCount: course._count.reviews,
            avgRating: {
              coolness: avgStats._avg.coolness || 0,
              usefulness: avgStats._avg.usefulness || 0,
              workload: avgStats._avg.workload || 0,
              attendance: avgStats._avg.attendance || 0,
              grading: avgStats._avg.grading || 0,
            },
          };
        })
      );

      // 4. 與全校平均的比較
      const [instructorAvg, globalAvg] = await Promise.all([
        prisma!.review.aggregate({
          where: {
            course: {
              instructors: {
                some: { instructorId: id },
              },
            },
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
        prisma!.review.aggregate({
          where: { status: "ACTIVE" },
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
        semesterTrends: semesterTrends.filter((t) => t.count > 0),
        ratingDistribution: distribution,
        topCourses,
        comparison: {
          instructor: {
            coolness: instructorAvg._avg.coolness || 0,
            usefulness: instructorAvg._avg.usefulness || 0,
            workload: instructorAvg._avg.workload || 0,
            attendance: instructorAvg._avg.attendance || 0,
            grading: instructorAvg._avg.grading || 0,
          },
          schoolAverage: {
            coolness: globalAvg._avg.coolness || 0,
            usefulness: globalAvg._avg.usefulness || 0,
            workload: globalAvg._avg.workload || 0,
            attendance: globalAvg._avg.attendance || 0,
            grading: globalAvg._avg.grading || 0,
          },
        },
      };
    });

    return Response.json(stats);
  } catch (error: any) {
    console.error("Failed to get instructor stats:", error);

    if (error.message === "Instructor not found") {
      return Response.json(
        { error: "Instructor not found" },
        { status: 404 }
      );
    }

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
