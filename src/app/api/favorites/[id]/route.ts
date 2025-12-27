import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireNkustUser } from "@/lib/auth";

// DELETE /api/favorites/[id] - 取消收藏
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 檢查使用者是否已登入且為高科大學生
    const user = await requireNkustUser();
    const { id: favoriteId } = await params;

    // 查詢收藏
    const favorite = await prisma.favorite.findUnique({
      where: { id: favoriteId },
    });

    if (!favorite) {
      return NextResponse.json({ error: "收藏不存在" }, { status: 404 });
    }

    // 檢查是否為收藏擁有者
    if (favorite.userId !== user.id) {
      return NextResponse.json(
        { error: "無權刪除此收藏" },
        { status: 403 }
      );
    }

    // 刪除收藏
    await prisma.favorite.delete({
      where: { id: favoriteId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting favorite:", error);
    return NextResponse.json(
      { error: "取消收藏失敗，請稍後再試" },
      { status: 500 }
    );
  }
}
