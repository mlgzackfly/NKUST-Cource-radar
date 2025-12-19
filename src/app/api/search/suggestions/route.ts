import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as Prisma from "@prisma/client";

type CourseSuggestion = Pick<Prisma.Course, "id" | "courseName" | "department">;
type InstructorSuggestion = Pick<Prisma.Instructor, "name">;
type DepartmentSuggestion = Pick<Prisma.Course, "department">;

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
    const [courses, instructors, departments] = await Promise.all([
      // Get top 8 matching courses
      prisma.course.findMany({
        where: {
          courseName: { contains: q },
        },
        distinct: ['courseName'],
        take: 8,
        select: {
          id: true,
          courseName: true,
          department: true,
        },
        orderBy: {
          courseName: 'asc',
        },
      }) as Promise<CourseSuggestion[]>, // Cast to CourseSuggestion[]
      // Get matching instructors
      prisma.instructor.findMany({
        where: {
          name: { contains: q },
        },
        distinct: ['name'],
        take: 3,
        select: {
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
      }) as Promise<InstructorSuggestion[]>, // Cast to InstructorSuggestion[]
      // Get unique departments matching the query
      prisma.course.findMany({
        where: {
          department: { contains: q },
        },
        distinct: ['department'],
        take: 2,
        select: {
          department: true,
        },
        orderBy: {
          department: 'asc',
        },
      }) as Promise<DepartmentSuggestion[]>, // Cast to DepartmentSuggestion[]
    ]);

    // Build suggestions with priority: courses > instructors > departments
    const suggestions = [
      ...courses.map((c: CourseSuggestion) => ({
        type: 'course' as const,
        value: c.courseName,
        label: c.courseName,
        department: c.department,
        id: c.id
      })),
      ...instructors.map((i: InstructorSuggestion) => ({
        type: 'instructor' as const,
        value: i.name,
        label: i.name,
        department: null
      })),
      ...departments
        .filter(d => d.department !== null)
        .map((d: DepartmentSuggestion) => ({
        type: 'department' as const,
        value: d.department!,
        label: d.department!,
      }))
    ];

    return NextResponse.json(suggestions) as Response;
  } catch (error) {
    console.error('Search suggestions error:', error);
    return NextResponse.json([]) as Response;
  }
}
