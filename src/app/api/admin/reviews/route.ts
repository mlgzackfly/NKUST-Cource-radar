// @ts-expect-error - Next.js 15.5.9 type definition issue with NextRequest

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search"); // 搜尋課程名稱或評論內容
    const status = searchParams.get("status"); // ACTIVE | HIDDEN | REMOVED | null (all)
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {};

    // 狀態篩選
    if (status && ["ACTIVE", "HIDDEN", "REMOVED"].includes(status)) {
      where.status = status;
    }

    // 搜尋功能
    if (search) {
      where.OR = [
        {
          body: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          course: {
            courseName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          course: {
            courseCode: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    const [reviews, total] = await Promise.all([
      prisma!.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, email: true, bannedAt: true },
          },
          course: {
            select: {
              id: true,
              courseName: true,
              courseCode: true,
              instructors: {
                include: {
                  instructor: {
                    select: { name: true },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              helpfulVotes: true,
              reports: true,
            },
          },
        },
      }),
      prisma!.review.count({ where }),
    ]);

    return Response.json({
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Failed to get reviews:", error);

    if (error?.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.message === "Admin access required") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
