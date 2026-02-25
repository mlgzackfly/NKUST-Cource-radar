import { NextResponse } from "next/server";
import { getCourseRatingSummary } from "@/lib/reviewSummary";
import { rateLimiter, RATE_LIMITS, getClientIp } from "@/lib/ratelimit";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(request);
  const rateLimit = rateLimiter.check(`api:${ip}`, RATE_LIMITS.api.limit, RATE_LIMITS.api.window);
  if (!rateLimit.success) {
    return Response.json({ error: "Too many requests" }, {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)),
        "X-RateLimit-Limit": String(RATE_LIMITS.api.limit),
        "X-RateLimit-Remaining": "0",
      },
    });
  }

  const p = await params;
  const summary = await getCourseRatingSummary(p.id);
  return Response.json({ courseId: p.id, summary });
}
