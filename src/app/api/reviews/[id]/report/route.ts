import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const p = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as Response;
    }

    // 驗證 @nkust.edu.tw
    if (!session.user.email.toLowerCase().endsWith("@nkust.edu.tw")) {
      return NextResponse.json({ error: "Only @nkust.edu.tw emails allowed" }, { status: 403 }) as Response;
    }

    const body = await request.json();
    const { reason } = body;

    // 驗證檢舉理由
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json({ error: "Report reason is required" }, { status: 400 }) as Response;
    }

    if (reason.trim().length > 500) {
      return NextResponse.json({ error: "Report reason is too long (max 500 characters)" }, { status: 400 }) as Response;
    }

    // 找到使用者
    const user = await prisma!.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 }) as Response;
    }

    // 檢查使用者是否被 ban
    if (user.bannedAt) {
      return NextResponse.json({ error: "User is banned" }, { status: 403 }) as Response;
    }

    // 檢查評論是否存在
    const review = await prisma!.review.findUnique({
      where: { id: p.id },
      select: { id: true, userId: true, status: true }
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 }) as Response;
    }

    // 禁止檢舉自己的評論
    if (review.userId === user.id) {
      return NextResponse.json({ error: "Cannot report your own review" }, { status: 403 }) as Response;
    }

    // 檢查是否已經檢舉過
    const existingReport = await prisma!.report.findFirst({
      where: {
        reviewId: p.id,
        userId: user.id
      }
    });

    if (existingReport) {
      return NextResponse.json({ error: "You have already reported this review" }, { status: 400 }) as Response;
    }

    // 建立檢舉
    const report = await prisma!.report.create({
      data: {
        reviewId: p.id,
        userId: user.id,
        reason: reason.trim()
      }
    });

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        createdAt: report.createdAt
      }
    }) as Response;

  } catch (error) {
    console.error("Failed to report review:", error);

    // 不洩露錯誤詳情給客戶端
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    ) as Response;
  }
}
