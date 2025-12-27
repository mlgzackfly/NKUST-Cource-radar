import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request): Promise<Response> {
  if (!prisma) {
    return Response.json(
      { courses: [], warning: "DATABASE_URL is not set. API is running without DB." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const clean = (v: string | null) => (v ? v.trim() : undefined) || undefined;

  // 基本篩選參數
  const q = clean(searchParams.get("q"));
  const year = clean(searchParams.get("year"));
  const term = clean(searchParams.get("term"));
  const campus = clean(searchParams.get("campus"));
  const division = clean(searchParams.get("division"));
  const department = clean(searchParams.get("department"));
  const take = Math.min(Number(searchParams.get("take") || "20"), 100);

  // 進階篩選參數
  const sortBy = clean(searchParams.get("sortBy")) || "latest"; // latest | name | credits | rating | reviews
  const sortOrder = clean(searchParams.get("sortOrder")) || "desc"; // asc | desc
  const minRating = searchParams.get("minRating") ? parseFloat(searchParams.get("minRating")!) : undefined;
  const maxWorkload = searchParams.get("maxWorkload") ? parseFloat(searchParams.get("maxWorkload")!) : undefined;
  const minGrading = searchParams.get("minGrading") ? parseFloat(searchParams.get("minGrading")!) : undefined;
  const timeSlot = clean(searchParams.get("timeSlot")); // 例如 "1-2" (星期一 2-3 節)

  const andFilters: Prisma.CourseWhereInput[] = [];
  if (year) andFilters.push({ year });
  if (term) andFilters.push({ term });
  if (campus) andFilters.push({ campus });
  if (division) andFilters.push({ division });
  if (department) andFilters.push({ department });

  // 時段篩選（簡單字串匹配）
  if (timeSlot) {
    andFilters.push({ time: { contains: timeSlot } });
  }

  // 基本查詢條件
  const whereClause: Prisma.CourseWhereInput = {
    ...(q
      ? {
          OR: [
            { courseName: { contains: q } },
            { courseCode: { contains: q } },
            { selectCode: { contains: q } },
            { department: { contains: q } },
            {
              instructors: {
                some: {
                  instructor: {
                    name: { contains: q }
                  }
                }
              }
            },
          ],
        }
      : {}),
    ...(andFilters.length ? { AND: andFilters } : {}),
  };

  // 決定排序方式
  let orderBy: any = { updatedAt: "desc" };

  if (sortBy === "name") {
    orderBy = { courseName: sortOrder as "asc" | "desc" };
  } else if (sortBy === "credits") {
    orderBy = { credits: sortOrder as "asc" | "desc" };
  } else if (sortBy === "latest") {
    orderBy = { updatedAt: sortOrder as "asc" | "desc" };
  }

  // 查詢課程
  let courses = await prisma.course.findMany({
    where: whereClause,
    orderBy: (sortBy === "rating" || sortBy === "reviews") ? undefined : orderBy,
    take: sortBy === "rating" || sortBy === "reviews" || minRating || maxWorkload || minGrading ? undefined : take,
    select: {
      id: true,
      courseName: true,
      courseCode: true,
      selectCode: true,
      department: true,
      campus: true,
      year: true,
      term: true,
      credits: true,
      time: true,
      classroom: true,
      instructors: {
        select: {
          instructor: { select: { id: true, name: true } },
        },
      },
      reviews: {
        where: { status: "ACTIVE" },
        select: {
          coolness: true,
          usefulness: true,
          workload: true,
          grading: true,
        },
      },
    },
  });

  // 計算平均評分並過濾
  type CourseWithStats = typeof courses[0] & {
    avgRating?: number;
    avgWorkload?: number;
    avgGrading?: number;
    reviewCount: number;
  };

  let coursesWithStats: CourseWithStats[] = courses.map((course: any) => {
    const reviews = course.reviews;
    const reviewCount = reviews.length;

    // 計算平均值（coolness 作為 overall rating）
    const avgRating = reviewCount > 0
      ? reviews.reduce((sum: number, r: any) => sum + (r.coolness || 0), 0) / reviewCount
      : 0;

    const avgWorkload = reviewCount > 0
      ? reviews.reduce((sum: number, r: any) => sum + (r.workload || 0), 0) / reviewCount
      : 0;

    const avgGrading = reviewCount > 0
      ? reviews.reduce((sum: number, r: any) => sum + (r.grading || 0), 0) / reviewCount
      : 0;

    return {
      ...course,
      avgRating,
      avgWorkload,
      avgGrading,
      reviewCount,
    };
  });

  // 套用評分篩選
  if (minRating !== undefined) {
    coursesWithStats = coursesWithStats.filter((c) => c.avgRating >= minRating);
  }

  if (maxWorkload !== undefined) {
    coursesWithStats = coursesWithStats.filter((c) => c.reviewCount === 0 || c.avgWorkload <= maxWorkload);
  }

  if (minGrading !== undefined) {
    coursesWithStats = coursesWithStats.filter((c) => c.avgGrading >= minGrading);
  }

  // 套用排序（若需要按評分或評論數）
  if (sortBy === "rating") {
    coursesWithStats.sort((a, b) =>
      sortOrder === "asc"
        ? a.avgRating - b.avgRating
        : b.avgRating - a.avgRating
    );
  } else if (sortBy === "reviews") {
    coursesWithStats.sort((a, b) =>
      sortOrder === "asc"
        ? a.reviewCount - b.reviewCount
        : b.reviewCount - a.reviewCount
    );
  }

  // 限制數量
  const finalCourses = coursesWithStats.slice(0, take);

  // 移除 reviews 欄位，只保留統計資料
  const result = finalCourses.map((c) => {
    const { reviews, ...rest } = c as any;
    return {
      ...rest,
      instructors: (rest.instructors as any[]).map((x: any) => x.instructor),
    };
  });

  return Response.json({ courses: result });
}


