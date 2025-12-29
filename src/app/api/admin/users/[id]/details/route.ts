// @ts-expect-error - Next.js 15.5.9 type definition issue with NextRequest

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();

    const { id: userId } = await params;

    // 獲取使用者基本資訊
    const user = await prisma!.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        bannedAt: true,
        role: true,
      },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // 獲取使用者的評論
    const reviews = await prisma!.review.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        coolness: true,
        usefulness: true,
        workload: true,
        attendance: true,
        grading: true,
        body: true,
        course: {
          select: {
            id: true,
            courseName: true,
            courseCode: true,
            instructors: {
              include: {
                instructor: {
                  select: { name: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            helpfulVotes: true,
            reports: true,
          },
        },
      },
    });

    // 獲取使用者發出的檢舉
    const reportsMade = await prisma!.report.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reason: true,
        createdAt: true,
        status: true,
        review: {
          select: {
            id: true,
            body: true,
            course: {
              select: {
                courseName: true,
                courseCode: true,
              },
            },
          },
        },
      },
    });

    // 獲取使用者評論被檢舉的記錄
    const reportsReceived = await prisma!.report.findMany({
      where: {
        review: {
          userId,
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reason: true,
        createdAt: true,
        status: true,
        review: {
          select: {
            id: true,
            body: true,
            course: {
              select: {
                courseName: true,
                courseCode: true,
              },
            },
          },
        },
      },
    });

    // 活動統計
    const stats = {
      totalReviews: reviews.length,
      activeReviews: reviews.filter((r: any) => r.status === "ACTIVE").length,
      hiddenReviews: reviews.filter((r: any) => r.status === "HIDDEN").length,
      removedReviews: reviews.filter((r: any) => r.status === "REMOVED").length,
      totalHelpfulVotes: reviews.reduce((sum: number, r: any) => sum + r._count.helpfulVotes, 0),
      totalReportsReceived: reportsReceived.length,
      totalReportsMade: reportsMade.length,
      averageRatings: {
        coolness:
          reviews.filter((r: any) => r.coolness).length > 0
            ? reviews.reduce((sum: number, r: any) => sum + (r.coolness || 0), 0) /
              reviews.filter((r: any) => r.coolness).length
            : 0,
        usefulness:
          reviews.filter((r: any) => r.usefulness).length > 0
            ? reviews.reduce((sum: number, r: any) => sum + (r.usefulness || 0), 0) /
              reviews.filter((r: any) => r.usefulness).length
            : 0,
        workload:
          reviews.filter((r: any) => r.workload).length > 0
            ? reviews.reduce((sum: number, r: any) => sum + (r.workload || 0), 0) /
              reviews.filter((r: any) => r.workload).length
            : 0,
        attendance:
          reviews.filter((r: any) => r.attendance).length > 0
            ? reviews.reduce((sum: number, r: any) => sum + (r.attendance || 0), 0) /
              reviews.filter((r: any) => r.attendance).length
            : 0,
        grading:
          reviews.filter((r: any) => r.grading).length > 0
            ? reviews.reduce((sum: number, r: any) => sum + (r.grading || 0), 0) /
              reviews.filter((r: any) => r.grading).length
            : 0,
      },
    };

    return Response.json({
      user,
      reviews,
      reportsMade,
      reportsReceived,
      stats,
    });
  } catch (error: any) {
    console.error("Failed to get user details:", error);

    if (error?.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.message === "Admin access required") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
