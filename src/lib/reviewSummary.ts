import { prisma } from "@/lib/db";

export type RatingSummary = {
  totalReviews: number;
  avg: {
    coolness: number | null;
    usefulness: number | null;
    workload: number | null;
    attendance: number | null;
  };
  count: {
    coolness: number;
    usefulness: number;
    workload: number;
    attendance: number;
  };
};

export async function getCourseRatingSummary(courseId: string): Promise<RatingSummary> {
  if (!prisma) {
    return {
      totalReviews: 0,
      avg: { coolness: null, usefulness: null, workload: null, attendance: null },
      count: { coolness: 0, usefulness: 0, workload: 0, attendance: 0 },
    };
  }

  const where = { courseId, status: "ACTIVE" as const };

  const [totalReviews, coolnessCount, usefulnessCount, workloadCount, attendanceCount, agg] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.count({ where: { ...where, coolness: { not: null } } }),
    prisma.review.count({ where: { ...where, usefulness: { not: null } } }),
    prisma.review.count({ where: { ...where, workload: { not: null } } }),
    prisma.review.count({ where: { ...where, attendance: { not: null } } }),
    prisma.review.aggregate({
      where,
      _avg: {
        coolness: true,
        usefulness: true,
        workload: true,
        attendance: true,
      },
    }),
  ]);

  return {
    totalReviews,
    avg: {
      coolness: agg._avg.coolness ?? null,
      usefulness: agg._avg.usefulness ?? null,
      workload: agg._avg.workload ?? null,
      attendance: agg._avg.attendance ?? null,
    },
    count: {
      coolness: coolnessCount,
      usefulness: usefulnessCount,
      workload: workloadCount,
      attendance: attendanceCount,
    },
  };
}


