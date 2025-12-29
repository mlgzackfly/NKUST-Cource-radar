import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/db";
import { rateLimiter, RATE_LIMITS } from "@/lib/ratelimit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const p = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email;

    // Rate limiting: 每用戶每小時最多 5 次檢舉操作
    const rateLimitKey = `report:${email}`;
    const rateLimit = rateLimiter.check(
      rateLimitKey,
      RATE_LIMITS.report.limit,
      RATE_LIMITS.report.window
    );

    if (!rateLimit.success) {
      const resetIn = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      return Response.json(
        {
          error: "Too many requests",
          retryAfter: resetIn,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(resetIn),
            "X-RateLimit-Limit": String(RATE_LIMITS.report.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.floor(rateLimit.resetTime / 1000)),
          },
        }
      );
    }

    // 驗證 @nkust.edu.tw
    if (!email.toLowerCase().endsWith("@nkust.edu.tw")) {
      return Response.json({ error: "Only @nkust.edu.tw emails allowed" }, { status: 403 });
    }

    const body = await request.json();
    const { reason } = body;

    // 驗證檢舉理由
    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return Response.json({ error: "Report reason is required" }, { status: 400 });
    }

    if (reason.trim().length > 500) {
      return Response.json(
        { error: "Report reason is too long (max 500 characters)" },
        { status: 400 }
      );
    }

    // 找到使用者
    const user = await prisma!.user.findUnique({
      where: { email },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // 檢查使用者是否被 ban
    if (user.bannedAt) {
      return Response.json({ error: "User is banned" }, { status: 403 });
    }

    // 檢查評論是否存在
    const review = await prisma!.review.findUnique({
      where: { id: p.id },
      select: { id: true, userId: true, status: true },
    });

    if (!review) {
      return Response.json({ error: "Review not found" }, { status: 404 });
    }

    // 禁止檢舉自己的評論
    if (review.userId === user.id) {
      return Response.json({ error: "Cannot report your own review" }, { status: 403 });
    }

    // 建立檢舉
    // 資料庫層級的 unique constraint 會防止重複檢舉
    const report = await prisma!.report.create({
      data: {
        reviewId: p.id,
        userId: user.id,
        reason: reason.trim(),
      },
    });

    return Response.json({
      success: true,
      report: {
        id: report.id,
        createdAt: report.createdAt,
      },
    });
  } catch (error) {
    console.error("Failed to report review:", error);

    // 處理 unique constraint violation (已經檢舉過)
    if ((error as any).code === "P2002") {
      return Response.json({ error: "You have already reported this review" }, { status: 400 });
    }

    // 不洩露錯誤詳情給客戶端
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
