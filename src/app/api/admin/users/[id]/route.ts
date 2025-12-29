// @ts-expect-error - Next.js 15.5.9 type definition issue with NextRequest

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const p = await params;
    const body = await request.json();
    const { action, note } = body; // action: "ban" | "unban"

    if (!["ban", "unban"].includes(action)) {
      return Response.json({ error: "Invalid action. Must be 'ban' or 'unban'" }, { status: 400 });
    }

    // 不能封禁自己
    if (p.id === admin.id) {
      return Response.json({ error: "Cannot ban yourself" }, { status: 400 });
    }

    // 查找使用者
    const user = await prisma!.user.findUnique({
      where: { id: p.id },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // 更新使用者封禁狀態
    const bannedAt = action === "ban" ? new Date() : null;
    const updatedUser = await prisma!.user.update({
      where: { id: p.id },
      data: { bannedAt },
    });

    // 記錄管理員操作
    await prisma!.adminAction.create({
      data: {
        type: "BAN_USER",
        actorId: admin.id,
        targetUserId: user.id,
        note: note || `${action === "ban" ? "封禁" : "解封"}使用者: ${user.email}`,
      },
    });

    return Response.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        bannedAt: updatedUser.bannedAt,
      },
    });
  } catch (error: any) {
    console.error("Failed to manage user:", error);

    if (error?.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.message === "Admin access required") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
