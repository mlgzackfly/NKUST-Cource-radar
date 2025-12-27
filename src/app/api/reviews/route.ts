import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/db";
import { validateReviewRatings, validateText } from "@/lib/validation";
import { rateLimiter, RATE_LIMITS, getClientIp } from "@/lib/ratelimit";

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
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
      return Response.json(
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
      );
    }

    // 驗證 @nkust.edu.tw
    if (!email.toLowerCase().endsWith("@nkust.edu.tw")) {
      return Response.json({ error: "Only @nkust.edu.tw emails allowed" }, { status: 403 });
    }

    const body = await request.json();
    const { courseId, body: reviewBody, authorDept } = body;

    // 驗證 courseId
    if (!courseId) {
      return Response.json({ error: "courseId is required" }, { status: 400 });
    }

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
      return Response.json(
        { error: error instanceof Error ? error.message : "Invalid rating values" },
        { status: 400 }
      );
    }

    // 驗證文字長度
    let validatedBody, validatedDept;
    try {
      validatedBody = validateText(reviewBody, 2000, "Review body");
      validatedDept = validateText(authorDept, 100, "Department");
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Invalid text length" },
        { status: 400 }
      );
    }

    // 找到或建立使用者
    const dbUser = await prisma!.user.upsert({
      where: { email },
      create: { email },
      update: {}
    });

    // 檢查是否被禁用
    if (dbUser.bannedAt) {
      return Response.json({ error: "User is banned" }, { status: 403 });
    }

    // 檢查是否已評論過
    const existing = await prisma!.review.findUnique({
      where: { userId_courseId: { userId: dbUser.id, courseId } }
    });

    if (existing) {
      return Response.json({ error: "You have already reviewed this course" }, { status: 409 });
    }

    // 建立評論（使用驗證後的數值）
    const review = await prisma!.review.create({
      data: {
        userId: dbUser.id,
        courseId,
        coolness: validatedRatings.coolness,
        usefulness: validatedRatings.usefulness,
        workload: validatedRatings.workload,
        attendance: validatedRatings.attendance,
        grading: validatedRatings.grading,
        body: validatedBody,
        authorDept: validatedDept,
        status: "ACTIVE"
      }
    });

    // 建立版本快照
    await prisma!.reviewVersion.create({
      data: {
        reviewId: review.id,
        coolness: validatedRatings.coolness,
        usefulness: validatedRatings.usefulness,
        workload: validatedRatings.workload,
        attendance: validatedRatings.attendance,
        grading: validatedRatings.grading,
        body: validatedBody,
        authorDept: validatedDept
      }
    });

    return Response.json({ success: true, reviewId: review.id }, { status: 201 });

  } catch (error) {
    console.error("Failed to create review:", error);

    // 不洩露錯誤詳情給客戶端
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
