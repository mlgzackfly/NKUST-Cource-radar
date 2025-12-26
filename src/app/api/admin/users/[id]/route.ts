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
    const { action, note } = body; // action: "ban" | "unban"

    if (!["ban", "unban"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'ban' or 'unban'" },
        { status: 400 }
      ) as Response;
    }

    // 不能封禁自己
    if (p.id === admin.id) {
      return NextResponse.json(
        { error: "Cannot ban yourself" },
        { status: 400 }
      ) as Response;
    }

    // 查找使用者
    const user = await prisma!.user.findUnique({
      where: { id: p.id }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 }) as Response;
    }

    // 更新使用者封禁狀態
    const bannedAt = action === "ban" ? new Date() : null;
    const updatedUser = await prisma!.user.update({
      where: { id: p.id },
      data: { bannedAt }
    });

    // 記錄管理員操作
    await prisma!.adminAction.create({
      data: {
        type: "BAN_USER",
        actorId: admin.id,
        targetUserId: user.id,
        note: note || `${action === "ban" ? "封禁" : "解封"}使用者: ${user.email}`
      }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        bannedAt: updatedUser.bannedAt
      }
    }) as Response;

  } catch (error: any) {
    console.error("Failed to manage user:", error);

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
