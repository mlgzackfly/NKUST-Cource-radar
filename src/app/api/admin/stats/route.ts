import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(): Promise<Response> {
  try {
    await requireAdmin();

    const [
      totalUsers,
      bannedUsers,
      totalReviews,
      activeReviews,
      hiddenReviews,
      removedReviews,
      openReports,
      totalReports,
    ] = await Promise.all([
      prisma!.user.count(),
      prisma!.user.count({ where: { bannedAt: { not: null } } }),
      prisma!.review.count(),
      prisma!.review.count({ where: { status: "ACTIVE" } }),
      prisma!.review.count({ where: { status: "HIDDEN" } }),
      prisma!.review.count({ where: { status: "REMOVED" } }),
      prisma!.report.count({ where: { status: "OPEN" } }),
      prisma!.report.count(),
    ]);

    return NextResponse.json({
      users: {
        total: totalUsers,
        active: totalUsers - bannedUsers,
        banned: bannedUsers,
      },
      reviews: {
        total: totalReviews,
        active: activeReviews,
        hidden: hiddenReviews,
        removed: removedReviews,
      },
      reports: {
        open: openReports,
        total: totalReports,
      },
    }) as Response;
  } catch (error: any) {
    console.error("Failed to get admin stats:", error);

    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as Response;
    }
    if (error?.message === "Admin access required") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 }) as Response;
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    ) as Response;
  }
}
