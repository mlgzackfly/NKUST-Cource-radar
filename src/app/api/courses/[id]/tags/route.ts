import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = Promise<{ id: string }>;

/**
 * GET /api/courses/[id]/tags
 *
 * 取得課程的標籤
 */
export async function GET(request: Request, { params }: { params: Params }) {
  if (!prisma) {
    return Response.json({ error: "Database not available" }, { status: 503 });
  }

  try {
    const { id } = await params;

    const courseTags = await prisma.courseTag.findMany({
      where: { courseId: id },
      orderBy: { score: "desc" },
      select: {
        score: true,
        source: true,
        tag: {
          select: {
            id: true,
            name: true,
            category: true,
            color: true,
          },
        },
      },
    });

    return Response.json({
      tags: courseTags.map((ct: any) => ({
        ...ct.tag,
        score: ct.score,
        source: ct.source,
      })),
    });
  } catch (error: any) {
    console.error("Course tags API error:", error);
    return Response.json(
      { error: error.message || "Failed to fetch course tags" },
      { status: 500 }
    );
  }
}
