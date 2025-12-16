import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Suggestion = {
  type: "course" | "instructor" | "department";
  text: string;
  label: string;
  id?: string;
  meta?: string;
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
    // Use ILIKE for partial matching (better for CJK languages)
    // Fetch course details with instructors
    const courseResults = (await prisma.$queryRawUnsafe(
      `SELECT
         c.id,
         c."courseName" as text,
         c.year,
         c.term,
         c.department,
         ARRAY_AGG(DISTINCT i.name) FILTER (WHERE i.name IS NOT NULL) as instructors
       FROM "Course" c
       LEFT JOIN "CourseInstructor" ci ON c.id = ci."courseId"
       LEFT JOIN "Instructor" i ON ci."instructorId" = i.id
       WHERE c."courseName" ILIKE $1 OR c."courseCode" ILIKE $1 OR c."selectCode" ILIKE $1
       GROUP BY c.id, c."courseName", c.year, c.term, c.department
       ORDER BY c."courseName"
       LIMIT 5`,
      `%${query}%`
    )) as Array<{
      id: string;
      text: string;
      year: string;
      term: string;
      department: string | null;
      instructors: string[] | null;
    }>;

    const instructorResults = (await prisma.$queryRawUnsafe(
      `SELECT DISTINCT i.id, i.name as text
       FROM "Instructor" i
       WHERE i.name ILIKE $1
       ORDER BY text
       LIMIT 3`,
      `%${query}%`
    )) as Array<{ id: string; text: string }>;

    const departmentResults = (await prisma.$queryRawUnsafe(
      `SELECT DISTINCT c.department as text
       FROM "Course" c
       WHERE c.department IS NOT NULL AND c.department ILIKE $1
       ORDER BY text
       LIMIT 3`,
      `%${query}%`
    )) as Array<{ text: string }>;

    const suggestions: Suggestion[] = [
      ...courseResults.map(r => {
        const metaParts: string[] = [];
        if (r.instructors && r.instructors.length > 0) {
          metaParts.push(r.instructors.join('、'));
        }
        if (r.department) {
          metaParts.push(r.department);
        }
        metaParts.push(`${r.year}-${r.term}`);

        return {
          type: "course" as const,
          text: r.text,
          label: r.text,
          id: r.id,
          meta: metaParts.join(' · ')
        };
      }),
      ...instructorResults.map(r => ({
        type: "instructor" as const,
        text: r.text,
        label: `教師：${r.text}`,
        id: r.id
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
