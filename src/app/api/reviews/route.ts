import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/db";
import { validateReviewRatings, validateText } from "@/lib/validation";

export async function POST(request: Request): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as Response;
    }

    const email = session.user.email;

    // 驗證 @nkust.edu.tw
    if (!email.toLowerCase().endsWith("@nkust.edu.tw")) {
      return NextResponse.json({ error: "Only @nkust.edu.tw emails allowed" }, { status: 403 }) as Response;
    }

    const body = await request.json();
    const { courseId, body: reviewBody, authorDept } = body;

    // 驗證 courseId
    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 }) as Response;
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

    // 找到或建立使用者
    const dbUser = await prisma!.user.upsert({
      where: { email },
      create: { email },
      update: {}
    });

    // 檢查是否被禁用
    if (dbUser.bannedAt) {
      return NextResponse.json({ error: "User is banned" }, { status: 403 }) as Response;
    }

    // 檢查是否已評論過
    const existing = await prisma!.review.findUnique({
      where: { userId_courseId: { userId: dbUser.id, courseId } }
    });

    if (existing) {
      return NextResponse.json({ error: "You have already reviewed this course" }, { status: 409 }) as Response;
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

    return NextResponse.json({ success: true, reviewId: review.id }, { status: 201 }) as Response;

  } catch (error) {
    console.error("Failed to create review:", error);

    // 不洩露錯誤詳情給客戶端
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    ) as Response;
  }
}
