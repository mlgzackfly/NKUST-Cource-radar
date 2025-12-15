import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Suggestion = {
  type: "course" | "instructor" | "department";
  text: string;
  label: string;
};

export async function GET(request: NextRequest) {
  if (!prisma) {
    return NextResponse.json({ suggestions: [] });
  }

  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q")?.trim() || "";

  if (!query || query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    // Use PostgreSQL full-text search for fast suggestions
    const courseResults = (await prisma.$queryRawUnsafe(
      `SELECT DISTINCT c."courseName" as text
       FROM "Course" c
       WHERE c."searchVector" @@ plainto_tsquery('simple', $1)
       ORDER BY ts_rank(c."searchVector", plainto_tsquery('simple', $1)) DESC
       LIMIT 5`,
      query
    )) as Array<{ text: string }>;

    const instructorResults = (await prisma.$queryRawUnsafe(
      `SELECT DISTINCT i.name as text
       FROM "Instructor" i
       WHERE i.name ILIKE $1
       LIMIT 3`,
      `%${query}%`
    )) as Array<{ text: string }>;

    const departmentResults = (await prisma.$queryRawUnsafe(
      `SELECT DISTINCT c.department as text
       FROM "Course" c
       WHERE c.department IS NOT NULL AND c.department ILIKE $1
       LIMIT 3`,
      `%${query}%`
    )) as Array<{ text: string }>;

    const suggestions: Suggestion[] = [
      ...courseResults.map(r => ({
        type: "course" as const,
        text: r.text,
        label: r.text
      })),
      ...instructorResults.map(r => ({
        type: "instructor" as const,
        text: r.text,
        label: `教師：${r.text}`
      })),
      ...departmentResults.map(r => ({
        type: "department" as const,
        text: r.text,
        label: `系所：${r.text}`
      }))
    ];

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Failed to fetch suggestions:", error);
    return NextResponse.json({ suggestions: [] });
  }
}
