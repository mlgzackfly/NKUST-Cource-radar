import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

interface CourseWithReviewCount {
  id: string;
  courseName: string;
  courseCode: string;
  year: number;
  term: number;
  campus: string;
  unit: string;
  _count: { reviews: number };
}

interface ReviewWithDetails {
  id: string;
  courseId: string;
  status: string;
  createdAt: Date;
  coolness: number | null;
  usefulness: number | null;
  workload: number | null;
  attendance: number | null;
  grading: number | null;
  body: string | null;
  authorDept: string | null;
  _count: { reports: number; helpfulVotes: number; comments: number };
  course: { courseName: string; courseCode: string };
}

/**
 * GET /api/admin/instructors/[id]
 * 管理員專用：取得單一教師的詳細統計資訊
 *
 * 包含：
 * - 教師基本資訊
 * - 所有課程列表
 * - 評論明細（含檢舉狀態）
 * - 學期趨勢
 * - 評分分佈
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!prisma) {
      return Response.json({ error: "Database not available" }, { status: 503 });
    }

    const { id } = await params;

    // 取得教師基本資訊
    const instructor = await prisma.instructor.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    if (!instructor) {
      return Response.json({ error: "Instructor not found" }, { status: 404 });
    }

    // 取得所有課程
    const courses = await prisma.course.findMany({
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
        campus: true,
        unit: true,
        _count: {
          select: {
            reviews: {
              where: { status: "ACTIVE" },
            },
          },
        },
      },
      orderBy: [{ year: "desc" }, { term: "desc" }],
    });

    const typedCourses = courses as CourseWithReviewCount[];
    const courseIds = typedCourses.map((c: CourseWithReviewCount) => c.id);

    // 取得所有評論（含狀態和檢舉）
    const reviews = await prisma.review.findMany({
      where: {
        courseId: { in: courseIds },
      },
      select: {
        id: true,
        courseId: true,
        status: true,
        createdAt: true,
        coolness: true,
        usefulness: true,
        workload: true,
        attendance: true,
        grading: true,
        body: true,
        authorDept: true,
        _count: {
          select: {
            reports: {
              where: { status: "OPEN" },
            },
            helpfulVotes: true,
            comments: true,
          },
        },
        course: {
          select: {
            courseName: true,
            courseCode: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const typedReviews = reviews as ReviewWithDetails[];

    // 計算學期趨勢
    const semesterMap = new Map<
      string,
      { reviews: ReviewWithDetails[]; semester: string; year: number; term: number }
    >();

    for (const course of typedCourses) {
      const semester = `${course.year}-${course.term}`;
      if (!semesterMap.has(semester)) {
        semesterMap.set(semester, {
          reviews: [],
          semester,
          year: course.year,
          term: course.term,
        });
      }
    }

    for (const review of typedReviews) {
      if (review.status !== "ACTIVE") continue;
      const course = typedCourses.find((c: CourseWithReviewCount) => c.id === review.courseId);
      if (!course) continue;
      const semester = `${course.year}-${course.term}`;
      semesterMap.get(semester)?.reviews.push(review);
    }

    const semesterTrends = Array.from(semesterMap.values())
      .map(({ reviews: semReviews, semester, year, term }) => {
        if (semReviews.length === 0) {
          return { semester, year, term, count: 0 };
        }

        const sum = { coolness: 0, usefulness: 0, workload: 0, attendance: 0, grading: 0 };
        const cnt = { coolness: 0, usefulness: 0, workload: 0, attendance: 0, grading: 0 };

        for (const r of semReviews) {
          if (r.coolness !== null) {
            sum.coolness += r.coolness;
            cnt.coolness++;
          }
          if (r.usefulness !== null) {
            sum.usefulness += r.usefulness;
            cnt.usefulness++;
          }
          if (r.workload !== null) {
            sum.workload += r.workload;
            cnt.workload++;
          }
          if (r.attendance !== null) {
            sum.attendance += r.attendance;
            cnt.attendance++;
          }
          if (r.grading !== null) {
            sum.grading += r.grading;
            cnt.grading++;
          }
        }

        return {
          semester,
          year,
          term,
          count: semReviews.length,
          avgCoolness: cnt.coolness > 0 ? sum.coolness / cnt.coolness : null,
          avgUsefulness: cnt.usefulness > 0 ? sum.usefulness / cnt.usefulness : null,
          avgWorkload: cnt.workload > 0 ? sum.workload / cnt.workload : null,
          avgAttendance: cnt.attendance > 0 ? sum.attendance / cnt.attendance : null,
          avgGrading: cnt.grading > 0 ? sum.grading / cnt.grading : null,
        };
      })
      .sort((a, b) => a.year - b.year || a.term - b.term);

    // 計算評分分佈
    const distribution = {
      coolness: [0, 0, 0, 0, 0],
      usefulness: [0, 0, 0, 0, 0],
      workload: [0, 0, 0, 0, 0],
      attendance: [0, 0, 0, 0, 0],
      grading: [0, 0, 0, 0, 0],
    };

    for (const r of typedReviews) {
      if (r.status !== "ACTIVE") continue;
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

    // 統計摘要
    const activeReviews = typedReviews.filter((r: ReviewWithDetails) => r.status === "ACTIVE");
    const hiddenReviews = typedReviews.filter((r: ReviewWithDetails) => r.status === "HIDDEN");
    const removedReviews = typedReviews.filter((r: ReviewWithDetails) => r.status === "REMOVED");
    const reviewsWithReports = typedReviews.filter((r: ReviewWithDetails) => r._count.reports > 0);

    return Response.json({
      instructor,
      summary: {
        totalCourses: typedCourses.length,
        totalReviews: typedReviews.length,
        activeReviews: activeReviews.length,
        hiddenReviews: hiddenReviews.length,
        removedReviews: removedReviews.length,
        reviewsWithOpenReports: reviewsWithReports.length,
      },
      courses: typedCourses.map((c: CourseWithReviewCount) => ({
        id: c.id,
        name: c.courseName,
        code: c.courseCode,
        semester: `${c.year}-${c.term}`,
        campus: c.campus,
        unit: c.unit,
        reviewCount: c._count.reviews,
      })),
      reviews: typedReviews.map((r: ReviewWithDetails) => ({
        id: r.id,
        courseId: r.courseId,
        courseName: r.course.courseName,
        courseCode: r.course.courseCode,
        status: r.status,
        createdAt: r.createdAt,
        coolness: r.coolness,
        usefulness: r.usefulness,
        workload: r.workload,
        attendance: r.attendance,
        grading: r.grading,
        body: r.body,
        authorDept: r.authorDept,
        openReports: r._count.reports,
        helpfulVotes: r._count.helpfulVotes,
        comments: r._count.comments,
      })),
      semesterTrends,
      ratingDistribution: distribution,
    });
  } catch (error) {
    console.error("Failed to get admin instructor detail:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
