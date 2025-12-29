// @ts-expect-error - Next.js 15.5.9 type definition issue with NextRequest

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!prisma) {
      return Response.json({ error: "Database not available" }, { status: 503 });
    }

    // 查詢教師基本資訊
    const instructor = await prisma.instructor.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    if (!instructor) {
      return Response.json({ error: "Instructor not found" }, { status: 404 });
    }

    // 查詢該教師所有課程
    const courses = await prisma.course.findMany({
      where: {
        instructors: {
          some: {
            instructorId: instructor.id,
          },
        },
      },
      orderBy: [{ year: "desc" }, { term: "desc" }, { courseName: "asc" }],
      select: {
        id: true,
        courseName: true,
        courseCode: true,
        selectCode: true,
        year: true,
        term: true,
        campus: true,
        department: true,
        enrolled: true,
        capacity: true,
        credits: true,
        requiredOrElective: true,
        classroom: true,
        time: true,
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    // 計算統計資訊
    const stats = {
      totalCourses: courses.length,
      totalEnrolled: courses.reduce((sum: number, c: any) => sum + (c.enrolled || 0), 0),
      totalReviews: courses.reduce((sum: number, c: any) => sum + c._count.reviews, 0),
      // 學期分佈
      semesters: Array.from(new Set(courses.map((c: any) => `${c.year}-${c.term}`)))
        .sort()
        .reverse(),
      // 校區分佈
      campuses: Array.from(new Set(courses.map((c: any) => c.campus).filter(Boolean))),
      // 系所分佈
      departments: Array.from(new Set(courses.map((c: any) => c.department).filter(Boolean))),
    };

    // 取得該教師的課程評價統計
    const reviewStats = await prisma.review.aggregate({
      where: {
        course: {
          instructors: {
            some: {
              instructorId: instructor.id,
            },
          },
        },
        status: "ACTIVE",
      },
      _avg: {
        coolness: true,
        usefulness: true,
        workload: true,
        attendance: true,
        grading: true,
      },
      _count: {
        id: true,
      },
    });

    return Response.json({
      instructor,
      courses,
      stats,
      reviewStats: {
        averageRatings: {
          coolness: reviewStats._avg.coolness || 0,
          usefulness: reviewStats._avg.usefulness || 0,
          workload: reviewStats._avg.workload || 0,
          attendance: reviewStats._avg.attendance || 0,
          grading: reviewStats._avg.grading || 0,
        },
        totalReviews: reviewStats._count.id,
      },
    });
  } catch (error: any) {
    console.error("Failed to get instructor details:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
