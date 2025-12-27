// @ts-expect-error - Next.js 15.5.9 type definition issue with NextRequest

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status"); // OPEN | RESOLVED | REJECTED | null (all)
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && ["OPEN", "RESOLVED", "REJECTED"].includes(status)) {
      where.status = status;
    }

    const [reports, total] = await Promise.all([
      prisma!.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, email: true }
          },
          review: {
            select: {
              id: true,
              body: true,
              status: true,
              user: {
                select: { id: true, email: true }
              },
              course: {
                select: { id: true, courseName: true, courseCode: true }
              }
            }
          }
        }
      }),
      prisma!.report.count({ where })
    ]);

    return Response.json({
      reports,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error("Failed to get reports:", error);

    if (error?.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error?.message === "Admin access required") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
