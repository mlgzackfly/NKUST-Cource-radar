import { prisma } from "@/lib/db";
import { requireNkustUser } from "@/lib/auth";

/**
 * DELETE /api/reviews/[id]/comments/[commentId]
 * 刪除自己的留言
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    if (!prisma) {
      return Response.json({ error: "資料庫連線失敗" }, { status: 503 });
    }

    // 檢查使用者是否已登入
    const user = await requireNkustUser();
    const { id: reviewId, commentId } = await params;

    // 查找留言
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        reviewId: true,
        userId: true,
      },
    });

    if (!comment) {
      return Response.json({ error: "留言不存在" }, { status: 404 });
    }

    // 確認留言屬於指定的評論
    if (comment.reviewId !== reviewId) {
      return Response.json({ error: "留言不屬於此評論" }, { status: 400 });
    }

    // 只能刪除自己的留言（管理員可以透過其他接口處理）
    if (comment.userId !== user.id) {
      return Response.json({ error: "無法刪除他人的留言" }, { status: 403 });
    }

    // 刪除留言
    await prisma.comment.delete({
      where: { id: commentId },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return Response.json({ error: "刪除留言失敗，請稍後再試" }, { status: 500 });
  }
}
