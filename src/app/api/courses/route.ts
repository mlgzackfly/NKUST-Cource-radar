import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request): Promise<Response> {
  if (!prisma) {
    return NextResponse.json(
      { courses: [], warning: "DATABASE_URL is not set. API is running without DB." },
      { status: 503 },
    ) as Response;
  }

  const { searchParams } = new URL(request.url);
  const clean = (v: string | null) => (v ? v.trim() : undefined) || undefined;
  const q = clean(searchParams.get("q"));
  const year = clean(searchParams.get("year"));
  const term = clean(searchParams.get("term"));
  const campus = clean(searchParams.get("campus"));
  const division = clean(searchParams.get("division"));
  const department = clean(searchParams.get("department"));
  const take = Math.min(Number(searchParams.get("take") || "20"), 100);

  const andFilters: Prisma.CourseWhereInput[] = [];
  if (year) andFilters.push({ year });
  if (term) andFilters.push({ term });
  if (campus) andFilters.push({ campus });
  if (division) andFilters.push({ division });
  if (department) andFilters.push({ department });

  const courses = await prisma.course.findMany({
    where: {
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
    },
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      courseName: true,
      courseCode: true,
      selectCode: true,
      department: true,
      campus: true,
      year: true,
      term: true,
      instructors: {
        select: {
          instructor: { select: { name: true } },
        },
      },
    },
  });

  return NextResponse.json({
    courses: (courses as any[]).map((c: any) => ({
      ...c,
      instructors: (c.instructors as any[]).map((x: any) => x.instructor.name),
    })),
  }) as Response;
}


