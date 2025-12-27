import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireNkustUser } from "@/lib/auth";

// DELETE /api/comments/[id] - 刪除留言（僅自己的）
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    if (!prisma) {
      return NextResponse.json(
        { error: "資料庫連線失敗" },
        { status: 503 }
      ) as Response;
    }

    // 檢查使用者是否已登入且為高科大學生
    const user = await requireNkustUser();
    const { id: commentId } = await params;

    // 查詢留言
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json({ error: "留言不存在" }, { status: 404 }) as Response;
    }

    // 檢查是否為留言擁有者
    if (comment.userId !== user.id) {
      return NextResponse.json(
        { error: "無權刪除此留言" },
        { status: 403 }
      ) as Response;
    }

    // 刪除留言
    await prisma.comment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true }) as Response;
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "刪除留言失敗，請稍後再試" },
      { status: 500 }
    ) as Response;
  }
}
