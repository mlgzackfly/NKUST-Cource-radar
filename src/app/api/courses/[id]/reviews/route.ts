import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getCourseRatingSummary } from "@/lib/reviewSummary";

type ReviewRow = {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  coolness: number | null;
  usefulness: number | null;
  workload: number | null;
  attendance: number | null;
  grading: number | null;
  body: string | null;
  authorDept: string | null;
  _count: { helpfulVotes: number; comments: number };
  helpfulVotes: Array<{ voteType: string; userId: string }>;
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const p = await params;
  if (!prisma) {
    const summary = await getCourseRatingSummary(p.id);
    return Response.json({
      courseId: p.id,
      summary,
      reviews: null,
      visibility: "summary_only",
      warning: "DATABASE_URL is not set. API is running without DB.",
    });
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  const url = new URL(request.url);
  const sort = url.searchParams.get("sort") || "latest";
  const take = Math.min(Number(url.searchParams.get("take") || "20"), 50);

  // 支援的排序選項: latest, oldest, helpful, highest, lowest
  type SortOption = "latest" | "oldest" | "helpful" | "highest" | "lowest";
  const validSorts: SortOption[] = ["latest", "oldest", "helpful", "highest", "lowest"];
  const sortOption: SortOption = validSorts.includes(sort as SortOption) ? (sort as SortOption) : "latest";

  // Check if user is logged in with @nkust.edu.tw email
  const isNkustUser = email?.toLowerCase().endsWith("@nkust.edu.tw");

  if (!isNkustUser) {
    const summary = await getCourseRatingSummary(p.id);
    return Response.json({
      courseId: p.id,
      summary,
      reviews: null,
      visibility: "summary_only"
    });
  }

  // 根據排序選項設定 orderBy
  // highest/lowest 需要在應用層排序（計算平均分數）
  const needsAppSort = sortOption === "highest" || sortOption === "lowest";

  let orderBy: any[];
  switch (sortOption) {
    case "helpful":
      orderBy = [{ helpfulVotes: { _count: "desc" as const } }, { createdAt: "desc" as const }];
      break;
    case "oldest":
      orderBy = [{ createdAt: "asc" as const }];
      break;
    case "highest":
    case "lowest":
      // 這兩種需要取全部再應用層排序
      orderBy = [{ createdAt: "desc" as const }];
      break;
    case "latest":
    default:
      orderBy = [{ createdAt: "desc" as const }];
      break;
  }

  // 取得當前使用者 ID
  let currentUserId: string | null = null;
  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });
    currentUserId = user?.id || null;
  }

  // 如果需要應用層排序，先取全部再排序後截取
  const reviewsRaw = await prisma.review.findMany({
    where: { courseId: p.id, status: "ACTIVE" },
    orderBy,
    take: needsAppSort ? undefined : take,
    select: {
      id: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
      coolness: true,
      usefulness: true,
      workload: true,
      attendance: true,
      grading: true,
      body: true,
      authorDept: true,
      _count: {
        select: {
          helpfulVotes: true,
          comments: true,
        },
      },
      helpfulVotes: {
        select: {
          voteType: true,
          userId: true
        }
      }
    },
  });

  // 計算平均分數的輔助函數
  const calcAvgRating = (r: ReviewRow): number => {
    const ratings = [r.coolness, r.usefulness, r.workload, r.attendance, r.grading].filter(
      (v): v is number => v !== null
    );
    return ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  };

  // 應用層排序
  let reviews = reviewsRaw as ReviewRow[];
  if (needsAppSort) {
    reviews = [...reviews].sort((a, b) => {
      const avgA = calcAvgRating(a);
      const avgB = calcAvgRating(b);
      return sortOption === "highest" ? avgB - avgA : avgA - avgB;
    });
    reviews = reviews.slice(0, take);
  }

  return Response.json({
    courseId: p.id,
    reviews: reviews.map((r) => {
      const upvotes = r.helpfulVotes.filter(v => v.voteType === 'UPVOTE').length;
      const downvotes = r.helpfulVotes.filter(v => v.voteType === 'DOWNVOTE').length;
      const currentUserVote = r.helpfulVotes.find(v => v.userId === currentUserId)?.voteType || null;

      const avgRating = calcAvgRating(r);
      return {
        id: r.id,
        isOwnReview: r.userId === currentUserId, // ✅ 只告訴是否為自己的評論，不洩露 userId
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        coolness: r.coolness,
        usefulness: r.usefulness,
        workload: r.workload,
        attendance: r.attendance,
        grading: r.grading,
        averageRating: avgRating > 0 ? Math.round(avgRating * 10) / 10 : null,
        body: r.body,
        authorDept: r.authorDept,
        votes: {
          upvotes,
          downvotes,
          netScore: upvotes - downvotes,
          currentUserVote
        },
        helpfulCount: r._count.helpfulVotes,
        commentCount: r._count.comments
      };
    }),
    visibility: "full",
    sort: sortOption,
  });
}
