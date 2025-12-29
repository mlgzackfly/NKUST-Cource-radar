import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Type definitions for Prisma query results
interface CourseExport {
  id: string;
  courseCode: string;
  courseName: string;
  year: number;
  term: number;
  campus: string;
  unit: string;
  credits: number | null;
  instructors: Array<{ instructor: { name: string } }>;
  _count: { reviews: number };
}

interface ReviewExport {
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
  course: {
    courseName: string;
    courseCode: string;
    instructors: Array<{ instructor: { name: string } }>;
  };
  helpfulVotes: Array<{ voteType: string }>;
  _count: { reports: number };
}

interface InstructorExport {
  id: string;
  name: string;
  courses: Array<{ course: { id: string } }>;
}

interface UserExport {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
  bannedAt: Date | null;
  sessions: Array<{ expires: Date }>;
  _count: { reviews: number; helpfulVotes: number; reports: number };
}

interface ReportExport {
  id: string;
  reviewId: string;
  reason: string;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  review: {
    body: string | null;
    course: { courseName: string };
  };
}

/**
 * GET /api/admin/export
 * 管理員專用：匯出數據（CSV 或 JSON 格式）
 *
 * Query Parameters:
 * - type: 匯出類型 (courses, reviews, instructors, users, reports)
 * - format: 格式 (csv, json) 預設 json
 * - year: 篩選學年 (選用)
 * - term: 篩選學期 (選用)
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
    const type = url.searchParams.get("type") || "courses";
    const format = url.searchParams.get("format") || "json";
    const year = url.searchParams.get("year");
    const term = url.searchParams.get("term");

    let data: any[] = [];
    let filename = "";
    let headers: string[] = [];

    switch (type) {
      case "courses":
        data = await exportCourses(
          year ? parseInt(year) : undefined,
          term ? parseInt(term) : undefined
        );
        filename = `courses_${new Date().toISOString().split("T")[0]}`;
        headers = [
          "id",
          "courseCode",
          "courseName",
          "year",
          "term",
          "campus",
          "unit",
          "credits",
          "instructors",
          "reviewCount",
          "avgCoolness",
          "avgUsefulness",
          "avgWorkload",
          "avgAttendance",
          "avgGrading",
        ];
        break;

      case "reviews":
        data = await exportReviews(
          year ? parseInt(year) : undefined,
          term ? parseInt(term) : undefined
        );
        filename = `reviews_${new Date().toISOString().split("T")[0]}`;
        headers = [
          "id",
          "courseId",
          "courseName",
          "courseCode",
          "instructor",
          "status",
          "createdAt",
          "coolness",
          "usefulness",
          "workload",
          "attendance",
          "grading",
          "bodyLength",
          "authorDept",
          "upvotes",
          "downvotes",
          "reportCount",
        ];
        break;

      case "instructors":
        data = await exportInstructors();
        filename = `instructors_${new Date().toISOString().split("T")[0]}`;
        headers = [
          "id",
          "name",
          "courseCount",
          "reviewCount",
          "avgCoolness",
          "avgUsefulness",
          "avgWorkload",
          "avgAttendance",
          "avgGrading",
        ];
        break;

      case "users":
        data = await exportUsers();
        filename = `users_${new Date().toISOString().split("T")[0]}`;
        headers = [
          "id",
          "email",
          "role",
          "createdAt",
          "lastLogin",
          "reviewCount",
          "voteCount",
          "reportCount",
          "isBanned",
        ];
        break;

      case "reports":
        data = await exportReports();
        filename = `reports_${new Date().toISOString().split("T")[0]}`;
        headers = [
          "id",
          "reviewId",
          "reason",
          "status",
          "createdAt",
          "resolvedAt",
          "courseName",
          "reviewBodyPreview",
        ];
        break;

      default:
        return Response.json({ error: "Invalid export type" }, { status: 400 });
    }

    if (format === "csv") {
      const csv = convertToCSV(data, headers);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }

    // JSON format
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.json"`,
      },
    });
  } catch (error) {
    console.error("Failed to export data:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * 匯出課程資料
 */
async function exportCourses(year?: number, term?: number) {
  const where: any = {};
  if (year) where.year = year;
  if (term) where.term = term;

  const courses = await prisma!.course.findMany({
    where,
    select: {
      id: true,
      courseCode: true,
      courseName: true,
      year: true,
      term: true,
      campus: true,
      unit: true,
      credits: true,
      instructors: {
        select: {
          instructor: {
            select: { name: true },
          },
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
    orderBy: [{ year: "desc" }, { term: "desc" }, { courseName: "asc" }],
  });

  // 計算每門課的平均評分
  const typedCourses = courses as CourseExport[];
  return Promise.all(
    typedCourses.map(async (course: CourseExport) => {
      const avgStats = await prisma!.review.aggregate({
        where: { courseId: course.id, status: "ACTIVE" },
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
        courseCode: course.courseCode,
        courseName: course.courseName,
        year: course.year,
        term: course.term,
        campus: course.campus,
        unit: course.unit,
        credits: course.credits,
        instructors: course.instructors
          .map((i: { instructor: { name: string } }) => i.instructor.name)
          .join(", "),
        reviewCount: course._count.reviews,
        avgCoolness: avgStats._avg.coolness ? Math.round(avgStats._avg.coolness * 10) / 10 : null,
        avgUsefulness: avgStats._avg.usefulness
          ? Math.round(avgStats._avg.usefulness * 10) / 10
          : null,
        avgWorkload: avgStats._avg.workload ? Math.round(avgStats._avg.workload * 10) / 10 : null,
        avgAttendance: avgStats._avg.attendance
          ? Math.round(avgStats._avg.attendance * 10) / 10
          : null,
        avgGrading: avgStats._avg.grading ? Math.round(avgStats._avg.grading * 10) / 10 : null,
      };
    })
  );
}

/**
 * 匯出評論資料（不含使用者識別資訊）
 */
async function exportReviews(year?: number, term?: number) {
  const where: any = {};
  if (year || term) {
    where.course = {};
    if (year) where.course.year = year;
    if (term) where.course.term = term;
  }

  const reviews = await prisma!.review.findMany({
    where,
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
      course: {
        select: {
          courseName: true,
          courseCode: true,
          instructors: {
            select: {
              instructor: {
                select: { name: true },
              },
            },
          },
        },
      },
      helpfulVotes: {
        select: { voteType: true },
      },
      _count: {
        select: { reports: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const typedReviews = reviews as ReviewExport[];
  return typedReviews.map((r: ReviewExport) => ({
    id: r.id,
    courseId: r.courseId,
    courseName: r.course.courseName,
    courseCode: r.course.courseCode,
    instructor: r.course.instructors
      .map((i: { instructor: { name: string } }) => i.instructor.name)
      .join(", "),
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    coolness: r.coolness,
    usefulness: r.usefulness,
    workload: r.workload,
    attendance: r.attendance,
    grading: r.grading,
    bodyLength: r.body?.length || 0,
    authorDept: r.authorDept,
    upvotes: r.helpfulVotes.filter((v: { voteType: string }) => v.voteType === "UPVOTE").length,
    downvotes: r.helpfulVotes.filter((v: { voteType: string }) => v.voteType === "DOWNVOTE").length,
    reportCount: r._count.reports,
  }));
}

/**
 * 匯出教師資料
 */
async function exportInstructors() {
  const instructors = await prisma!.instructor.findMany({
    select: {
      id: true,
      name: true,
      courses: {
        select: {
          course: {
            select: {
              id: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const typedInstructors = instructors as InstructorExport[];
  return Promise.all(
    typedInstructors.map(async (instructor: InstructorExport) => {
      const courseIds = instructor.courses.map((c: { course: { id: string } }) => c.course.id);
      const reviewCount = await prisma!.review.count({
        where: {
          courseId: { in: courseIds },
          status: "ACTIVE",
        },
      });

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

      return {
        id: instructor.id,
        name: instructor.name,
        courseCount: courseIds.length,
        reviewCount,
        avgCoolness: avgStats._avg.coolness ? Math.round(avgStats._avg.coolness * 10) / 10 : null,
        avgUsefulness: avgStats._avg.usefulness
          ? Math.round(avgStats._avg.usefulness * 10) / 10
          : null,
        avgWorkload: avgStats._avg.workload ? Math.round(avgStats._avg.workload * 10) / 10 : null,
        avgAttendance: avgStats._avg.attendance
          ? Math.round(avgStats._avg.attendance * 10) / 10
          : null,
        avgGrading: avgStats._avg.grading ? Math.round(avgStats._avg.grading * 10) / 10 : null,
      };
    })
  );
}

/**
 * 匯出使用者資料（僅基本統計，不含敏感資訊）
 */
async function exportUsers() {
  const users = await prisma!.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      bannedAt: true,
      sessions: {
        select: { expires: true },
        orderBy: { expires: "desc" },
        take: 1,
      },
      _count: {
        select: {
          reviews: true,
          helpfulVotes: true,
          reports: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const typedUsers = users as UserExport[];
  return typedUsers.map((u: UserExport) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    lastLogin: u.sessions[0]?.expires.toISOString() || null,
    reviewCount: u._count.reviews,
    voteCount: u._count.helpfulVotes,
    reportCount: u._count.reports,
    isBanned: u.bannedAt !== null,
  }));
}

/**
 * 匯出檢舉資料
 */
async function exportReports() {
  const reports = await prisma!.report.findMany({
    select: {
      id: true,
      reviewId: true,
      reason: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      review: {
        select: {
          body: true,
          course: {
            select: { courseName: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const typedReports = reports as ReportExport[];
  return typedReports.map((r: ReportExport) => ({
    id: r.id,
    reviewId: r.reviewId,
    reason: r.reason,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString() || null,
    courseName: r.review.course.courseName,
    reviewBodyPreview: r.review.body?.substring(0, 100) || "",
  }));
}

/**
 * 將資料轉換為 CSV 格式
 */
function convertToCSV(data: any[], headers: string[]): string {
  if (data.length === 0) {
    return headers.join(",") + "\n";
  }

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) {
      return "";
    }
    const str = String(value);
    // 如果包含逗號、換行或雙引號，需要用雙引號包裹
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = data.map((row) => headers.map((h) => escapeCSV(row[h])).join(","));

  return [headers.join(","), ...rows].join("\n");
}
