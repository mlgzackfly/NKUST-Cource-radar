// @ts-expect-error - Next.js 15.5.9 type definition issue with NextRequest

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const p = await params;
    const body = await request.json();
    const { action, note } = body; // action: "resolve" | "reject"

    if (!["resolve", "reject"].includes(action)) {
      return Response.json(
        { error: "Invalid action. Must be 'resolve' or 'reject'" },
        { status: 400 }
      );
    }

    // 查找檢舉
    const report = await prisma!.report.findUnique({
      where: { id: p.id }
    });

    if (!report) {
      return Response.json({ error: "Report not found" }, { status: 404 });
    }

    if (report.status !== "OPEN") {
      return Response.json(
        { error: "Report has already been handled" },
        { status: 400 }
      );
    }

    // 更新檢舉狀態
    const newStatus = action === "resolve" ? "RESOLVED" : "REJECTED";
    const updatedReport = await prisma!.report.update({
      where: { id: p.id },
      data: { status: newStatus }
    });

    // 記錄管理員操作
    await prisma!.adminAction.create({
      data: {
        type: "REQUEST_EDIT",
        actorId: admin.id,
        targetReviewId: report.reviewId,
        note: note || `${action === "resolve" ? "已處理" : "已拒絕"}檢舉: ${report.reason}`
      }
    });

    return Response.json({
      success: true,
      report: updatedReport
    });

  } catch (error: any) {
    console.error("Failed to handle report:", error);

    if (error?.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.message === "Admin access required") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
