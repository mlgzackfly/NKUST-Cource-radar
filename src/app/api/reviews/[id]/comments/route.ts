import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireNkustUser } from "@/lib/auth";
import { rateLimiter } from "@/lib/ratelimit";

// POST /api/reviews/[id]/comments - 新增留言
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!prisma) {
      return Response.json({ error: "資料庫連線失敗" }, { status: 503 });
    }

    // 檢查使用者是否已登入且為高科大學生
    const user = await requireNkustUser();
    const { id: reviewId } = await params;

    // Rate limiting
    const rateLimitKey = `comment:${user.id}`;
    const rateLimit = rateLimiter.check(rateLimitKey, 10, 60 * 1000);

    if (!rateLimit.success) {
      return Response.json(
        { error: "操作太頻繁，請稍後再試" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)),
          },
        }
      );
    }

    // 檢查評論是否存在
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return Response.json({ error: "評論不存在" }, { status: 404 });
    }

    // 解析 request body
    const body = await request.json();
    const { body: commentBody } = body;

    // 驗證留言內容
    if (!commentBody || typeof commentBody !== "string") {
      return Response.json({ error: "留言內容不可為空" }, { status: 400 });
    }

    const trimmedBody = commentBody.trim();
    if (trimmedBody.length === 0) {
      return Response.json({ error: "留言內容不可為空" }, { status: 400 });
    }

    if (trimmedBody.length > 500) {
      return Response.json({ error: "留言內容過長（最多 500 字）" }, { status: 400 });
    }

    // 建立留言
    const comment = await prisma.comment.create({
      data: {
        reviewId,
        userId: user.id,
        body: trimmedBody,
      },
    });

    return Response.json(
      {
        success: true,
        commentId: comment.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating comment:", error);
    return Response.json({ error: "建立留言失敗，請稍後再試" }, { status: 500 });
  }
}

// GET /api/reviews/[id]/comments - 取得留言列表
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!prisma) {
      return Response.json({ error: "資料庫連線失敗" }, { status: 503 });
    }

    // 檢查使用者是否已登入（取得當前使用者 ID，未登入則為 null）
    const user = await requireNkustUser().catch(() => null);
    const { id: reviewId } = await params;

    // 檢查評論是否存在
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return Response.json({ error: "評論不存在" }, { status: 404 });
    }

    // 解析分頁參數
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // 查詢留言
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { reviewId },
        orderBy: { createdAt: "asc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          body: true,
          createdAt: true,
          userId: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      }),
      prisma.comment.count({
        where: { reviewId },
      }),
    ]);

    // 格式化留言（匿名化）
    const formattedComments = comments.map((comment: any) => {
      // 從 email 提取系所資訊（例如 C109193108@nkust.edu.tw → 資訊系）
      const email = comment.user.email;
      const localPart = email.split("@")[0];

      // 簡單的系所判斷邏輯（可以根據實際情況調整）
      let authorDept = null;
      if (localPart.match(/^[A-Z]\d{9}$/)) {
        // 學號格式，第一個字母可能代表系所
        const deptCode = localPart[0];
        // 這裡可以建立一個對照表，暫時使用簡化版本
        authorDept = `${deptCode}系`;
      }

      return {
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        isOwnComment: user?.id === comment.userId,
        authorDept,
      };
    });

    return Response.json({
      comments: formattedComments,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);

    // 如果是未登入錯誤，回傳空列表
    if ((error as Error).message?.includes("需要使用")) {
      return Response.json({ error: "需要登入才能查看留言" }, { status: 401 });
    }

    return Response.json({ error: "取得留言失敗，請稍後再試" }, { status: 500 });
  }
}
