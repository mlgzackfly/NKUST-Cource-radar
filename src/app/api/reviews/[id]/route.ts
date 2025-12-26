import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/db";

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

    // 驗證 @nkust.edu.tw
    if (!session.user.email.toLowerCase().endsWith("@nkust.edu.tw")) {
      return NextResponse.json({ error: "Only @nkust.edu.tw emails allowed" }, { status: 403 }) as Response;
    }

    const body = await request.json();
    const { coolness, usefulness, workload, attendance, grading, body: reviewBody, authorDept } = body;

    // 驗證至少有一個評分
    if (!coolness && !usefulness && !workload && !attendance && !grading) {
      return NextResponse.json({ error: "At least one rating is required" }, { status: 400 }) as Response;
    }

    // 找到使用者
    const user = await prisma!.user.findUnique({
      where: { email: session.user.email }
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

    // 更新評論
    const updatedReview = await prisma!.review.update({
      where: { id: p.id },
      data: {
        coolness,
        usefulness,
        workload,
        attendance,
        grading,
        body: reviewBody?.trim() || null,
        authorDept: authorDept?.trim() || null,
      }
    });

    // 建立版本快照
    await prisma!.reviewVersion.create({
      data: {
        reviewId: updatedReview.id,
        coolness,
        usefulness,
        workload,
        attendance,
        grading,
        body: reviewBody?.trim() || null,
        authorDept: authorDept?.trim() || null
      }
    });

    return NextResponse.json({ success: true, reviewId: updatedReview.id }) as Response;

  } catch (error) {
    console.error("Failed to update review:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
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

    // 驗證 @nkust.edu.tw
    if (!session.user.email.toLowerCase().endsWith("@nkust.edu.tw")) {
      return NextResponse.json({ error: "Only @nkust.edu.tw emails allowed" }, { status: 403 }) as Response;
    }

    // 找到使用者
    const user = await prisma!.user.findUnique({
      where: { email: session.user.email }
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
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    ) as Response;
  }
}
