// @ts-expect-error - Next.js 15.5.9 type definition issue with NextRequest

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCached, CACHE_TTL } from "@/lib/cache";

/**
 * GET /api/departments/[name]/stats
 * 取得系所的詳細統計資料
 *
 * Response:
 * - overview: 概覽統計（課程數、教師數、評論數）
 * - semesterTrends: 按學期的趨勢
 * - topInstructors: 熱門教師
 * - topCourses: 熱門課程
 * - ratingDistribution: 評分分佈
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    if (!prisma) {
      return Response.json(
        { error: "Database not available" },
        { status: 503 }
      );
    }

    const departmentName = decodeURIComponent(name);

    // 使用 cache 提升效能
    const cacheKey = `department_stats:${departmentName}`;
    const stats = await getCached(cacheKey, CACHE_TTL.INSTRUCTOR_STATS, async () => {
      // 1. 概覽統計
      const courses = await prisma!.course.findMany({
        where: { department: departmentName },
        select: {
          id: true,
          year: true,
          term: true,
          courseName: true,
          courseCode: true,
          instructors: {
            include: {
              instructor: true,
            },
          },
          _count: {
            select: {
              reviews: {
                where: { status: "ACTIVE" },
              },
            },
          },
        },
      });

      if (courses.length === 0) {
        throw new Error("Department not found or has no courses");
      }

      const uniqueInstructors = new Set(
        courses.flatMap((c: any) => c.instructors.map((ci: any) => ci.instructor.id))
      );

      const totalReviews = courses.reduce((sum: number, c: any) => sum + c._count.reviews, 0);

      // 2. 按學期的趨勢
      const semesterMap = new Map<string, string[]>();
      for (const course of courses) {
        const semester = `${course.year}-${course.term}`;
        if (!semesterMap.has(semester)) {
          semesterMap.set(semester, []);
        }
        semesterMap.get(semester)!.push(course.id);
      }

      const semesterTrends = await Promise.all(
        Array.from(semesterMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(async ([semester, courseIds]) => {
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
                courseCount: courseIds.length,
                reviewCount: 0,
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
              courseCount: courseIds.length,
              reviewCount: count,
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

      // 3. 熱門教師（按該系所的評論數排序）
      const instructorReviewCounts = new Map<string, { instructor: any; count: number }>();

      for (const course of courses) {
        const reviewCount = course._count.reviews;
        for (const ci of course.instructors) {
          const existing = instructorReviewCounts.get(ci.instructor.id);
          if (existing) {
            existing.count += reviewCount;
          } else {
            instructorReviewCounts.set(ci.instructor.id, {
              instructor: ci.instructor,
              count: reviewCount,
            });
          }
        }
      }

      const topInstructorsData = Array.from(instructorReviewCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const topInstructors = await Promise.all(
        topInstructorsData.map(async ({ instructor, count }) => {
          const avgStats = await prisma!.review.aggregate({
            where: {
              course: {
                department: departmentName,
                instructors: {
                  some: {
                    instructorId: instructor.id,
                  },
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
          });

          return {
            id: instructor.id,
            name: instructor.name,
            reviewCount: count,
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

      // 4. 熱門課程
      const topCoursesData = courses
        .sort((a: any, b: any) => b._count.reviews - a._count.reviews)
        .slice(0, 10);

      const topCourses = await Promise.all(
        topCoursesData.map(async (course: any) => {
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
            instructors: course.instructors.map((ci: any) => ci.instructor.name),
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

      // 5. 評分分佈
      const allReviews = await prisma!.review.findMany({
        where: {
          course: {
            department: departmentName,
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
        coolness: [0, 0, 0, 0, 0],
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

      return {
        overview: {
          department: departmentName,
          totalCourses: courses.length,
          totalInstructors: uniqueInstructors.size,
          totalReviews,
        },
        semesterTrends: semesterTrends.filter((t) => t.reviewCount > 0),
        topInstructors,
        topCourses,
        ratingDistribution: distribution,
      };
    });

    return Response.json(stats);
  } catch (error: any) {
    console.error("Failed to get department stats:", error);

    if (error.message === "Department not found or has no courses") {
      return Response.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
