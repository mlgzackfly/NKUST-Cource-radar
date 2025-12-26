// @ts-expect-error - Next.js 15.5.9 type definition issue with NextRequest

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    await requireAdmin();

    const { id: userId } = await params;

    // 獲取使用者的評論按月統計
    const reviewsByMonth = await prisma!.$queryRaw<Array<{ month: Date; count: bigint }>>`
      SELECT
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*)::bigint as count
      FROM "Review"
      WHERE "userId" = ${userId}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month DESC
      LIMIT 12
    `;

    // 獲取評論的評分分佈
    const ratingDistribution = await prisma!.review.groupBy({
      by: ["coolness"],
      where: {
        userId,
        coolness: { not: null }
      },
      _count: true
    });

    // 轉換數據格式
    const monthlyData = reviewsByMonth.map((item: { month: Date; count: bigint }) => ({
      month: item.month.toISOString().substring(0, 7), // YYYY-MM
      count: Number(item.count)
    })).reverse();

    return NextResponse.json({
      monthlyReviews: monthlyData,
      ratingDistribution: ratingDistribution.map((item: any) => ({
        rating: item.coolness,
        count: item._count
      }))
    }) as Response;

  } catch (error: any) {
    console.error("Failed to get user activity:", error);

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
