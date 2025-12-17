import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 驗證 @nkust.edu.tw
    if (!session.user.email.toLowerCase().endsWith("@nkust.edu.tw")) {
      return NextResponse.json({ error: "Only @nkust.edu.tw emails allowed" }, { status: 403 });
    }

    const body = await request.json();
    const { courseId, coolness, usefulness, workload, attendance, body: reviewBody, authorDept } = body;

    // 驗證
    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    if (!coolness && !usefulness && !workload && !attendance) {
      return NextResponse.json({ error: "At least one rating is required" }, { status: 400 });
    }

    // 找到或建立使用者
    const user = await prisma!.user.upsert({
      where: { email: session.user.email },
      create: { email: session.user.email },
      update: {}
    });

    // 檢查是否被禁用
    if (user.bannedAt) {
      return NextResponse.json({ error: "User is banned" }, { status: 403 });
    }

    // 檢查是否已評論過
    const existing = await prisma!.review.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } }
    });

    if (existing) {
      return NextResponse.json({ error: "You have already reviewed this course" }, { status: 409 });
    }

    // 建立評論
    const review = await prisma!.review.create({
      data: {
        userId: user.id,
        courseId,
        coolness,
        usefulness,
        workload,
        attendance,
        body: reviewBody?.trim() || null,
        authorDept: authorDept?.trim() || null,
        status: "ACTIVE"
      }
    });

    // 建立版本快照
    await prisma!.reviewVersion.create({
      data: {
        reviewId: review.id,
        coolness,
        usefulness,
        workload,
        attendance,
        body: reviewBody?.trim() || null,
        authorDept: authorDept?.trim() || null
      }
    });

    return NextResponse.json({ success: true, reviewId: review.id }, { status: 201 });

  } catch (error) {
    console.error("Failed to create review:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
