import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/db";
import { validateReviewRatings, validateText } from "@/lib/validation";
import { rateLimiter, RATE_LIMITS } from "@/lib/ratelimit";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const p = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as Response;
    }

    const email = session.user.email;

    // Rate limiting: 每用戶每分鐘最多 10 次評論操作
    const rateLimitKey = `review:${email}`;
    const rateLimit = rateLimiter.check(
      rateLimitKey,
      RATE_LIMITS.review.limit,
      RATE_LIMITS.review.window
    );

    if (!rateLimit.success) {
      const resetIn = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: "Too many requests",
          retryAfter: resetIn,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(resetIn),
            "X-RateLimit-Limit": String(RATE_LIMITS.review.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.floor(rateLimit.resetTime / 1000)),
          },
        }
      ) as Response;
    }

    // 驗證 @nkust.edu.tw
    if (!email.toLowerCase().endsWith("@nkust.edu.tw")) {
      return NextResponse.json({ error: "Only @nkust.edu.tw emails allowed" }, { status: 403 }) as Response;
    }

    const body = await request.json();
    const { body: reviewBody, authorDept } = body;

    // 驗證評分（範圍 1-5）
    let validatedRatings;
    try {
      validatedRatings = validateReviewRatings({
        coolness: body.coolness,
        usefulness: body.usefulness,
        workload: body.workload,
        attendance: body.attendance,
        grading: body.grading,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid rating values" },
        { status: 400 }
      ) as Response;
    }

    // 驗證文字長度
    let validatedBody, validatedDept;
    try {
      validatedBody = validateText(reviewBody, 2000, "Review body");
      validatedDept = validateText(authorDept, 100, "Department");
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid text length" },
        { status: 400 }
      ) as Response;
    }

    // 找到使用者
    const user = await prisma!.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 }) as Response;
    }

    // 檢查評論是否存在且屬於該使用者
    const existingReview = await prisma!.review.findUnique({
      where: { id: p.id }
    });

    if (!existingReview) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 }) as Response;
    }

    if (existingReview.userId !== user.id) {
      return NextResponse.json({ error: "You can only edit your own reviews" }, { status: 403 }) as Response;
    }

    // 更新評論（使用驗證後的數值）
    const updatedReview = await prisma!.review.update({
      where: { id: p.id },
      data: {
        coolness: validatedRatings.coolness,
        usefulness: validatedRatings.usefulness,
        workload: validatedRatings.workload,
        attendance: validatedRatings.attendance,
        grading: validatedRatings.grading,
        body: validatedBody,
        authorDept: validatedDept,
      }
    });

    // 建立版本快照
    await prisma!.reviewVersion.create({
      data: {
        reviewId: updatedReview.id,
        coolness: validatedRatings.coolness,
        usefulness: validatedRatings.usefulness,
        workload: validatedRatings.workload,
        attendance: validatedRatings.attendance,
        grading: validatedRatings.grading,
        body: validatedBody,
        authorDept: validatedDept
      }
    });

    return NextResponse.json({ success: true, reviewId: updatedReview.id }) as Response;

  } catch (error) {
    console.error("Failed to update review:", error);

    // 不洩露錯誤詳情給客戶端
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    ) as Response;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const p = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as Response;
    }

    const email = session.user.email;

    // Rate limiting: 每用戶每分鐘最多 10 次評論操作
    const rateLimitKey = `review:${email}`;
    const rateLimit = rateLimiter.check(
      rateLimitKey,
      RATE_LIMITS.review.limit,
      RATE_LIMITS.review.window
    );

    if (!rateLimit.success) {
      const resetIn = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: "Too many requests",
          retryAfter: resetIn,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(resetIn),
            "X-RateLimit-Limit": String(RATE_LIMITS.review.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.floor(rateLimit.resetTime / 1000)),
          },
        }
      ) as Response;
    }

    // 驗證 @nkust.edu.tw
    if (!email.toLowerCase().endsWith("@nkust.edu.tw")) {
      return NextResponse.json({ error: "Only @nkust.edu.tw emails allowed" }, { status: 403 }) as Response;
    }

    // 找到使用者
    const user = await prisma!.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 }) as Response;
    }

    // 檢查評論是否存在且屬於該使用者
    const existingReview = await prisma!.review.findUnique({
      where: { id: p.id }
    });

    if (!existingReview) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 }) as Response;
    }

    if (existingReview.userId !== user.id) {
      return NextResponse.json({ error: "You can only delete your own reviews" }, { status: 403 }) as Response;
    }

    // 刪除評論（cascade 會自動刪除相關的 votes, comments, reports 等）
    await prisma!.review.delete({
      where: { id: p.id }
    });

    return NextResponse.json({ success: true, message: "Review deleted successfully" }) as Response;

  } catch (error) {
    console.error("Failed to delete review:", error);

    // 不洩露錯誤詳情給客戶端
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    ) as Response;
  }
}
