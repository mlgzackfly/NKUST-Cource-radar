import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/tags
 *
 * Query Parameters:
 * - category: 篩選標籤類別（選填）
 */
export async function GET(request: Request): Promise<Response> {
  if (!prisma) {
    return Response.json(
      { error: "Database not available" },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const tags = await prisma.tag.findMany({
      where: category ? { category: category as any } : undefined,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        category: true,
        color: true,
        _count: {
          select: {
            courseTags: true,
          },
        },
      },
    });

    return Response.json({
      tags: tags.map((tag: any) => ({
        id: tag.id,
        name: tag.name,
        category: tag.category,
        color: tag.color,
        courseCount: tag._count.courseTags,
      })),
    });
  } catch (error: any) {
    console.error("Tags API error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch tags" },
      { status: 500 }
    );
  }
}
