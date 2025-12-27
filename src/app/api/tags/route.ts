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
    return NextResponse.json(
      { error: "Database not available" },
      { status: 503 }
    ) as Response;
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

    return NextResponse.json({
      tags: tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        category: tag.category,
        color: tag.color,
        courseCount: tag._count.courseTags,
      })),
    }) as Response;
  } catch (error: any) {
    console.error("Tags API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tags" },
      { status: 500 }
    ) as Response;
  }
}
