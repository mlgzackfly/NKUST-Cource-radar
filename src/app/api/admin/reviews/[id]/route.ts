// @ts-expect-error - Next.js 15.5.9 type definition issue with NextRequest

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const p = await params;
    const body = await request.json();
    const { action, note } = body; // action: "hide" | "unhide" | "remove"

    if (!["hide", "unhide", "remove"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'hide', 'unhide', or 'remove'" },
        { status: 400 }
      ) as Response;
    }

    // 查找評論
    const review = await prisma!.review.findUnique({
      where: { id: p.id },
      include: { user: { select: { id: true, email: true } } }
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 }) as Response;
    }

    // 決定新狀態和操作類型
    let newStatus: "ACTIVE" | "HIDDEN" | "REMOVED";
    let actionType: "HIDE_REVIEW" | "UNHIDE_REVIEW" | "REMOVE_REVIEW";

    if (action === "hide") {
      newStatus = "HIDDEN";
      actionType = "HIDE_REVIEW";
    } else if (action === "unhide") {
      newStatus = "ACTIVE";
      actionType = "UNHIDE_REVIEW";
    } else {
      newStatus = "REMOVED";
      actionType = "REMOVE_REVIEW";
    }

    // 更新評論狀態
    const updatedReview = await prisma!.review.update({
      where: { id: p.id },
      data: { status: newStatus }
    });

    // 記錄管理員操作
    await prisma!.adminAction.create({
      data: {
        type: actionType,
        actorId: admin.id,
        targetReviewId: review.id,
        targetUserId: review.userId,
        note: note || `${action === "hide" ? "隱藏" : action === "unhide" ? "恢復" : "移除"}評論`
      }
    });

    return NextResponse.json({
      success: true,
      review: updatedReview
    }) as Response;

  } catch (error: any) {
    console.error("Failed to manage review:", error);

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
