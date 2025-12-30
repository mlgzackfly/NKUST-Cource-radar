import { prisma } from "@/lib/db";
import { getCached, CACHE_TTL, cacheKeys } from "@/lib/cache";

interface CourseSuggestion {
  id: string;
  courseName: string;
  department: string | null;
}

interface InstructorSuggestion {
  id: string;
  name: string;
}

interface DepartmentSuggestion {
  department: string | null;
}

interface Suggestion {
  type: "course" | "instructor" | "department";
  value: string;
  label: string;
  department?: string | null;
  id?: string;
}

async function fetchSuggestions(q: string): Promise<Suggestion[]> {
  // Use full-text search for courses (much faster with GIN index)
  // Falls back to pattern matching for instructors and departments
  const [courses, instructors, departments] = await Promise.all([
    // Full-text search for courses using searchVector (GIN index)
    prisma!.$queryRaw<CourseSuggestion[]>`
      SELECT id, "courseName", department FROM (
        SELECT DISTINCT ON ("courseName") id, "courseName", department,
               ts_rank("searchVector", plainto_tsquery('simple', ${q})) as rank
        FROM "Course"
        WHERE "searchVector" @@ plainto_tsquery('simple', ${q})
        ORDER BY "courseName", rank DESC
      ) ranked
      ORDER BY rank DESC
      LIMIT 8
    `,
    // Pattern matching for instructors (no full-text index)
    prisma!.instructor.findMany({
      where: {
        name: { contains: q },
      },
      distinct: ["name"],
      take: 3,
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    }) as Promise<InstructorSuggestion[]>,
    // Pattern matching for departments
    prisma!.course.findMany({
      where: {
        department: { contains: q },
      },
      distinct: ["department"],
      take: 2,
      select: {
        department: true,
      },
      orderBy: {
        department: "asc",
      },
    }) as Promise<DepartmentSuggestion[]>,
  ]);

  // Build suggestions with priority: courses > instructors > departments
  return [
    ...courses.map((c: CourseSuggestion) => ({
      type: "course" as const,
      value: c.courseName,
      label: c.courseName,
      department: c.department,
      id: c.id,
    })),
    ...instructors.map((i: InstructorSuggestion) => ({
      type: "instructor" as const,
      value: i.name,
      label: i.name,
      department: null,
      id: i.id,
    })),
    ...departments
      .filter((d: DepartmentSuggestion) => d.department !== null)
      .map((d: DepartmentSuggestion) => ({
        type: "department" as const,
        value: d.department!,
        label: d.department!,
      })),
  ];
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return Response.json([]);
  }

  if (!prisma) {
    return Response.json([]);
  }

  try {
    const suggestions = await getCached<Suggestion[]>(
      cacheKeys.searchSuggestions(q.toLowerCase()),
      CACHE_TTL.SEARCH_RESULTS,
      () => fetchSuggestions(q)
    );

    return Response.json(suggestions);
  } catch (error) {
    console.error("Search suggestions error:", error);
    return Response.json([]);
  }
}
