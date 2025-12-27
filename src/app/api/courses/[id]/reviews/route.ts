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
    return NextResponse.json({
      courseId: p.id,
      summary,
      reviews: null,
      visibility: "summary_only",
      warning: "DATABASE_URL is not set. API is running without DB.",
    }) as Response;
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  const sort = new URL(request.url).searchParams.get("sort") || "latest";
  const take = Math.min(Number(new URL(request.url).searchParams.get("take") || "20"), 50);

  // Check if user is logged in with @nkust.edu.tw email
  const isNkustUser = email?.toLowerCase().endsWith("@nkust.edu.tw");

  if (!isNkustUser) {
    const summary = await getCourseRatingSummary(p.id);
    return NextResponse.json({
      courseId: p.id,
      summary,
      reviews: null,
      visibility: "summary_only"
    }) as Response;
  }

  const orderBy =
    sort === "helpful"
      ? [{ helpfulVotes: { _count: "desc" as const } }, { createdAt: "desc" as const }]
      : [{ createdAt: "desc" as const }];

  // 取得當前使用者 ID
  let currentUserId: string | null = null;
  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });
    currentUserId = user?.id || null;
  }

  const reviews = await prisma.review.findMany({
    where: { courseId: p.id, status: "ACTIVE" },
    orderBy,
    take,
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

  return NextResponse.json({
    courseId: p.id,
    reviews: (reviews as ReviewRow[]).map((r) => {
      const upvotes = r.helpfulVotes.filter(v => v.voteType === 'UPVOTE').length;
      const downvotes = r.helpfulVotes.filter(v => v.voteType === 'DOWNVOTE').length;
      const currentUserVote = r.helpfulVotes.find(v => v.userId === currentUserId)?.voteType || null;

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
  }) as Response;
}
