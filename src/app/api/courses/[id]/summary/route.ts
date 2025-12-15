import { NextResponse } from "next/server";
import { getCourseRatingSummary } from "@/lib/reviewSummary";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const p = await params;
  const summary = await getCourseRatingSummary(p.id);
  return NextResponse.json({ courseId: p.id, summary }) as Response;
}


