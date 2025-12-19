import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json([]) as Response;
  }

  if (!prisma) {
    return NextResponse.json([]) as Response;
  }

  try {
    // Search for courses, instructors, and departments using full-text search
    const [coursesRaw, instructorsRaw, departments] = await Promise.all([
      // Get top 8 matching courses (prioritize courses)
      prisma.$queryRaw<Array<{ id: string; courseName: string; department: string | null; rank: number }>>`
        SELECT c.id, c."courseName", c.department, ts_rank(c."searchVector", plainto_tsquery('simple', ${q})) as rank
        FROM "Course" c
        WHERE c."searchVector" @@ plainto_tsquery('simple', ${q})
        ORDER BY rank DESC
        LIMIT 8
      `,
      // Get matching instructors
      prisma.$queryRaw<Array<{ name: string; department: string | null }>>`
        SELECT DISTINCT i.name, i.department
        FROM "Instructor" i
        WHERE i.name ILIKE ${'%' + q + '%'}
        ORDER BY i.name
        LIMIT 3
      `,
      // Get unique departments matching the query (only 2)
      prisma.$queryRaw<Array<{ department: string }>>`
        SELECT DISTINCT c.department
        FROM "Course" c
        WHERE c.department IS NOT NULL
          AND c.department ILIKE ${'%' + q + '%'}
        ORDER BY c.department
        LIMIT 2
      `
    ]);

    // Remove duplicates from courses by courseName
    const seenNames = new Set<string>();
    const courses = coursesRaw.filter((c: { id: string; courseName: string; department: string | null; rank: number }) => {
      if (seenNames.has(c.courseName)) {
        return false;
      }
      seenNames.add(c.courseName);
      return true;
    });

    // Build suggestions with priority: courses > instructors > departments
    const suggestions = [
      ...courses.map((c: { id: string; courseName: string; department: string | null }) => ({
        type: 'course' as const,
        value: c.courseName,
        label: c.courseName,
        department: c.department,
        id: c.id
      })),
      ...instructorsRaw.map((i: { name: string; department: string | null }) => ({
        type: 'instructor' as const,
        value: i.name,
        label: i.name,
        department: i.department
      })),
      ...departments.map((d: { department: string }) => ({
        type: 'department' as const,
        value: d.department,
        label: d.department
      }))
    ];

    return NextResponse.json(suggestions) as Response;
  } catch (error) {
    console.error('Search suggestions error:', error);
    return NextResponse.json([]) as Response;
  }
}
