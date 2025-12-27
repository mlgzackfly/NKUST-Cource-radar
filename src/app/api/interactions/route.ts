import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * POST /api/interactions
 *
 * Body:
 * {
 *   courseId: string
 *   type: "VIEW" | "REVIEW" | "FAVORITE" | "SEARCH"
 *   weight?: number (預設 1.0)
 * }
 */
export async function POST(request: Request): Promise<Response> {
  if (!prisma) {
    return Response.json(
      { error: "Database not available" },
      { status: 503 }
    );
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { courseId, type, weight = 1.0 } = body;

    // 驗證參數
    if (!courseId || !type) {
      return Response.json(
        { error: "courseId and type are required" },
        { status: 400 }
      );
    }

    const validTypes = ["VIEW", "REVIEW", "FAVORITE", "SEARCH"];
    if (!validTypes.includes(type)) {
      return Response.json(
        { error: `type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // 檢查課程是否存在
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });

    if (!course) {
      return Response.json({ error: "Course not found" }, { status: 404 });
    }

    // 記錄互動
    const interaction = await prisma.userInteraction.create({
      data: {
        userId: user.id,
        courseId,
        type,
        weight,
      },
    });

    // 如果是重要互動（REVIEW, FAVORITE），清除推薦快取
    if (type === "REVIEW" || type === "FAVORITE") {
      await prisma.recommendationCache.deleteMany({
        where: { userId: user.id },
      });
    }

    return Response.json({
      success: true,
      interaction: {
        id: interaction.id,
        type: interaction.type,
        createdAt: interaction.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Interaction API error:", error);
    return Response.json(
      { error: error.message || "Failed to record interaction" },
      { status: 500 }
    );
  }
}
