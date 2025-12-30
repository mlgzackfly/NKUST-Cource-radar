// @ts-expect-error - Next.js 15.5.9 type definition issue with NextRequest

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

// 支援的操作類型
type ActionType =
  | "ban"
  | "unban"
  | "set_admin"
  | "remove_admin"
  | "restrict_review"
  | "unrestrict_review";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const p = await params;
    const body = await request.json();
    const { action, note, restrictDays } = body as {
      action: ActionType;
      note?: string;
      restrictDays?: number; // 限制天數 (7, 30, 90, -1 永久)
    };

    const validActions: ActionType[] = [
      "ban",
      "unban",
      "set_admin",
      "remove_admin",
      "restrict_review",
      "unrestrict_review",
    ];

    if (!validActions.includes(action)) {
      return Response.json(
        { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    // 不能對自己操作
    if (p.id === admin.id) {
      return Response.json({ error: "Cannot perform this action on yourself" }, { status: 400 });
    }

    // 查找使用者
    const user = await prisma!.user.findUnique({
      where: { id: p.id },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // 根據操作類型執行不同邏輯
    let updateData: Record<string, unknown> = {};
    let actionType: string;
    let actionNote: string;

    switch (action) {
      case "ban":
        updateData = { bannedAt: new Date() };
        actionType = "BAN_USER";
        actionNote = note || `封禁使用者: ${user.email}`;
        break;

      case "unban":
        updateData = { bannedAt: null };
        actionType = "UNBAN_USER";
        actionNote = note || `解封使用者: ${user.email}`;
        break;

      case "set_admin":
        if (user.role === "ADMIN") {
          return Response.json({ error: "User is already an admin" }, { status: 400 });
        }
        updateData = { role: "ADMIN" };
        actionType = "SET_ADMIN";
        actionNote = note || `設定管理員: ${user.email}`;
        break;

      case "remove_admin":
        if (user.role !== "ADMIN") {
          return Response.json({ error: "User is not an admin" }, { status: 400 });
        }
        updateData = { role: "USER" };
        actionType = "REMOVE_ADMIN";
        actionNote = note || `移除管理員: ${user.email}`;
        break;

      case "restrict_review":
        if (restrictDays === undefined || restrictDays === null) {
          return Response.json({ error: "restrictDays is required" }, { status: 400 });
        }
        // -1 表示永久限制
        const restrictedUntil =
          restrictDays === -1
            ? new Date("2099-12-31")
            : new Date(Date.now() + restrictDays * 24 * 60 * 60 * 1000);
        updateData = { reviewRestrictedUntil: restrictedUntil };
        actionType = "RESTRICT_REVIEW";
        actionNote =
          note ||
          `限制評論: ${user.email} (${restrictDays === -1 ? "永久" : `${restrictDays} 天`})`;
        break;

      case "unrestrict_review":
        updateData = { reviewRestrictedUntil: null };
        actionType = "UNRESTRICT_REVIEW";
        actionNote = note || `解除評論限制: ${user.email}`;
        break;

      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    // 更新使用者
    const updatedUser = await prisma!.user.update({
      where: { id: p.id },
      data: updateData,
    });

    // 記錄管理員操作
    await prisma!.adminAction.create({
      data: {
        type: actionType as any,
        actorId: admin.id,
        targetUserId: user.id,
        note: actionNote,
      },
    });

    return Response.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        bannedAt: updatedUser.bannedAt,
        reviewRestrictedUntil: updatedUser.reviewRestrictedUntil,
      },
    });
  } catch (error: unknown) {
    console.error("Failed to manage user:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (errorMessage === "Admin access required") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
