import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireNkustUser } from "@/lib/auth";

// GET /api/courses/[id]/favorite-status - 檢查課程是否已收藏
export async function GET(
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

    // 檢查使用者是否已登入（未登入則回傳 false）
    const user = await requireNkustUser().catch(() => null);

    if (!user) {
      return NextResponse.json({
        isFavorited: false,
        favoriteId: null,
      }) as Response;
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

    return NextResponse.json({
      isFavorited: !!favorite,
      favoriteId: favorite?.id || null,
    }) as Response;
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return NextResponse.json(
      { error: "檢查收藏狀態失敗，請稍後再試" },
      { status: 500 }
    ) as Response;
  }
}
