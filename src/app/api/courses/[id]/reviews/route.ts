import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getCourseRatingSummary } from "@/lib/reviewSummary";

type ReviewRow = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  coolness: number | null;
  usefulness: number | null;
  workload: number | null;
  attendance: number | null;
  body: string | null;
  authorDept: string | null;
  _count: { helpfulVotes: number; comments: number };
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

  const { userId } = await auth();
  const user = userId ? await currentUser() : null;
  const email = user?.primaryEmailAddress?.emailAddress;

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

  const reviews = await prisma.review.findMany({
    where: { courseId: p.id, status: "ACTIVE" },
    orderBy,
    take,
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      coolness: true,
      usefulness: true,
      workload: true,
      attendance: true,
      body: true,
      authorDept: true,
      _count: {
        select: {
          helpfulVotes: true,
          comments: true,
        },
      },
    },
  });

  return NextResponse.json({
    courseId: p.id,
    reviews: (reviews as ReviewRow[]).map((r) => ({
      ...r,
      helpfulCount: r._count.helpfulVotes,
      commentCount: r._count.comments,
      _count: undefined,
    })),
    visibility: "full",
  }) as Response;
}
