import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireNkustUser } from "@/lib/auth";

// GET /api/courses/[id]/favorite-status - 檢查課程是否已收藏
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!prisma) {
      return Response.json({ error: "資料庫連線失敗" }, { status: 503 });
    }

    // 檢查使用者是否已登入（未登入則回傳 false）
    const user = await requireNkustUser().catch(() => null);

    if (!user) {
      return Response.json({
        isFavorited: false,
        favoriteId: null,
      });
    }

    const { id: courseId } = await params;

    // 查詢收藏
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId,
        },
      },
    });

    return Response.json({
      isFavorited: !!favorite,
      favoriteId: favorite?.id || null,
    });
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return Response.json({ error: "檢查收藏狀態失敗，請稍後再試" }, { status: 500 });
  }
}
