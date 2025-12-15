import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Cache this route for 1 hour (best-effort; platform dependent).
export const revalidate = 3600;

export async function GET(): Promise<Response> {
  if (!prisma) {
    return NextResponse.json(
      { error: "DATABASE_URL is not set. API is running without DB." },
      { status: 503 },
    ) as Response;
  }

  const [years, terms, campuses, divisions, departments] = (await Promise.all([
    prisma.course.findMany({
      select: { year: true },
      distinct: ["year"],
      orderBy: { year: "desc" },
    }),
    prisma.course.findMany({
      select: { term: true },
      distinct: ["term"],
      orderBy: { term: "asc" },
    }),
    prisma.course.findMany({
      where: { campus: { not: null } },
      select: { campus: true },
      distinct: ["campus"],
      orderBy: { campus: "asc" },
    }),
    prisma.course.findMany({
      where: { division: { not: null } },
      select: { division: true },
      distinct: ["division"],
      orderBy: { division: "asc" },
    }),
    prisma.course.findMany({
      where: { department: { not: null } },
      select: { department: true },
      distinct: ["department"],
      orderBy: { department: "asc" },
    }),
  ])) as [
    Array<{ year: string }>,
    Array<{ term: string }>,
    Array<{ campus: string | null }>,
    Array<{ division: string | null }>,
    Array<{ department: string | null }>,
  ];

  return NextResponse.json(
    {
      years: years.map((x) => x.year),
      terms: terms.map((x) => x.term),
      campuses: campuses.map((x) => x.campus).filter(Boolean),
      divisions: divisions.map((x) => x.division).filter(Boolean),
      departments: departments.map((x) => x.department).filter(Boolean),
    },
    {
      headers: {
        // Best-effort caching. (Works best on platforms that respect s-maxage.)
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  ) as Response;
}


