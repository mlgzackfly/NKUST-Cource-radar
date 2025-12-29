import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Always fetch fresh data to reflect new imports immediately
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (!prisma) {
    return Response.json(
      { error: "DATABASE_URL is not set. API is running without DB." },
      { status: 503 },
    );
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

  return Response.json({
    years: years.map((x) => x.year),
    terms: terms.map((x) => x.term),
    campuses: campuses.map((x) => x.campus).filter(Boolean),
    divisions: divisions.map((x) => x.division).filter(Boolean),
    departments: departments.map((x) => x.department).filter(Boolean),
  });
}


