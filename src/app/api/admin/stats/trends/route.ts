import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(): Promise<Response> {
  try {
    await requireAdmin();

    // 取得過去 30 天的日期範圍
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // 使用者註冊趨勢 (按日統計)
    const userTrend = await prisma!.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT
        DATE("createdAt") as date,
        COUNT(*)::bigint as count
      FROM "User"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // 評論發布趨勢 (按日統計)
    const reviewTrend = await prisma!.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT
        DATE("createdAt") as date,
        COUNT(*)::bigint as count
      FROM "Review"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // 檢舉趨勢 (按日統計)
    const reportTrend = await prisma!.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT
        DATE("createdAt") as date,
        COUNT(*)::bigint as count
      FROM "Report"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // 填充缺失的日期（將 bigint 轉為 number）
    const fillDates = (data: Array<{ date: Date; count: bigint }>) => {
      const result: Array<{ date: string; count: number }> = [];
      const dataMap = new Map(
        data.map((item) => [item.date.toISOString().split("T")[0], Number(item.count)])
      );

      const current = new Date(startDate);
      while (current <= endDate) {
        const dateStr = current.toISOString().split("T")[0];
        result.push({
          date: dateStr,
          count: dataMap.get(dateStr) || 0,
        });
        current.setDate(current.getDate() + 1);
      }

      return result;
    };

    return Response.json({
      users: fillDates(userTrend),
      reviews: fillDates(reviewTrend),
      reports: fillDates(reportTrend),
    });
  } catch (error: any) {
    console.error("Failed to get trends:", error);

    if (error?.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.message === "Admin access required") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
