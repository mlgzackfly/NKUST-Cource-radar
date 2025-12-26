import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin();

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search"); // email search
    const banned = searchParams.get("banned"); // "true" | "false" | null (all)
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.email = { contains: search, mode: "insensitive" };
    }

    if (banned === "true") {
      where.bannedAt = { not: null };
    } else if (banned === "false") {
      where.bannedAt = null;
    }

    const [users, total] = await Promise.all([
      prisma!.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          bannedAt: true,
          role: true,
          _count: {
            select: {
              reviews: true,
              reports: true
            }
          }
        }
      }),
      prisma!.user.count({ where })
    ]);

    return NextResponse.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }) as Response;

  } catch (error: any) {
    console.error("Failed to get users:", error);

    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as Response;
    }
    if (error?.message === "Admin access required") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 }) as Response;
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    ) as Response;
  }
}
