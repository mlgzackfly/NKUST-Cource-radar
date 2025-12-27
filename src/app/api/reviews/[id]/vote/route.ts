import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/db";
import { rateLimiter, RATE_LIMITS } from "@/lib/ratelimit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const p = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email;

    // Rate limiting: 每用戶每分鐘最多 20 次投票操作
    const rateLimitKey = `vote:${email}`;
    const rateLimit = rateLimiter.check(
      rateLimitKey,
      RATE_LIMITS.vote.limit,
      RATE_LIMITS.vote.window
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
            "X-RateLimit-Limit": String(RATE_LIMITS.vote.limit),
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
    const { voteType } = body;

    // 驗證 voteType
    if (voteType !== 'UPVOTE' && voteType !== 'DOWNVOTE') {
      return Response.json({ error: "Invalid vote type. Must be 'UPVOTE' or 'DOWNVOTE'" }, { status: 400 });
    }

    // 找到使用者
    const user = await prisma!.user.findUnique({
      where: { email }
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
      select: { userId: true }
    });

    if (!review) {
      return Response.json({ error: "Review not found" }, { status: 404 });
    }

    // 禁止對自己的評論投票
    if (review.userId === user.id) {
      return Response.json({ error: "Cannot vote on your own review" }, { status: 403 });
    }

    // 使用 upsert 處理投票（新投票或更改票型）
    await prisma!.helpfulVote.upsert({
      where: {
        reviewId_userId: {
          reviewId: p.id,
          userId: user.id
        }
      },
      create: {
        reviewId: p.id,
        userId: user.id,
        voteType: voteType
      },
      update: {
        voteType: voteType
      }
    });

    // 即時計算統計
    const [upvotes, downvotes] = await Promise.all([
      prisma!.helpfulVote.count({
        where: { reviewId: p.id, voteType: 'UPVOTE' }
      }),
      prisma!.helpfulVote.count({
        where: { reviewId: p.id, voteType: 'DOWNVOTE' }
      })
    ]);

    return Response.json({
      success: true,
      vote: { voteType },
      counts: {
        upvotes,
        downvotes,
        netScore: upvotes - downvotes
      }
    });

  } catch (error) {
    console.error("Failed to vote on review:", error);

    // 不洩露錯誤詳情給客戶端
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const p = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email;

    // Rate limiting: 每用戶每分鐘最多 20 次投票操作
    const rateLimitKey = `vote:${email}`;
    const rateLimit = rateLimiter.check(
      rateLimitKey,
      RATE_LIMITS.vote.limit,
      RATE_LIMITS.vote.window
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
            "X-RateLimit-Limit": String(RATE_LIMITS.vote.limit),
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

    // 找到使用者
    const user = await prisma!.user.findUnique({
      where: { email }
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // 刪除投票（idempotent - 不存在也不報錯）
    await prisma!.helpfulVote.deleteMany({
      where: {
        reviewId: p.id,
        userId: user.id
      }
    });

    // 即時計算統計
    const [upvotes, downvotes] = await Promise.all([
      prisma!.helpfulVote.count({
        where: { reviewId: p.id, voteType: 'UPVOTE' }
      }),
      prisma!.helpfulVote.count({
        where: { reviewId: p.id, voteType: 'DOWNVOTE' }
      })
    ]);

    return Response.json({
      success: true,
      counts: {
        upvotes,
        downvotes,
        netScore: upvotes - downvotes
      }
    });

  } catch (error) {
    console.error("Failed to delete vote:", error);

    // 不洩露錯誤詳情給客戶端
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
