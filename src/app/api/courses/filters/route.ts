import { prisma, prismaRaw } from "@/lib/db";
import { getCached, CACHE_TTL, cacheKeys } from "@/lib/cache";

interface FiltersResponse {
  years: string[];
  terms: string[];
  campuses: string[];
  divisions: string[];
  departments: string[];
}

async function fetchFiltersFromDB(): Promise<FiltersResponse> {
  // 使用原始 SQL 進行 DISTINCT 查詢，比 Prisma findMany + distinct 更快
  const [years, terms, campuses, divisions, departments] = await Promise.all([
    prismaRaw<{ year: string }[]>`
      SELECT DISTINCT year FROM "Course" ORDER BY year DESC
    `,
    prismaRaw<{ term: string }[]>`
      SELECT DISTINCT term FROM "Course" ORDER BY term ASC
    `,
    prismaRaw<{ campus: string }[]>`
      SELECT DISTINCT campus FROM "Course" WHERE campus IS NOT NULL ORDER BY campus ASC
    `,
    prismaRaw<{ division: string }[]>`
      SELECT DISTINCT division FROM "Course" WHERE division IS NOT NULL ORDER BY division ASC
    `,
    prismaRaw<{ department: string }[]>`
      SELECT DISTINCT department FROM "Course" WHERE department IS NOT NULL ORDER BY department ASC
    `,
  ]);

  return {
    years: years.map((x) => x.year),
    terms: terms.map((x) => x.term),
    campuses: campuses.map((x) => x.campus),
    divisions: divisions.map((x) => x.division),
    departments: departments.map((x) => x.department),
  };
}

export async function GET(): Promise<Response> {
  if (!prisma) {
    return Response.json(
      { error: "DATABASE_URL is not set. API is running without DB." },
      { status: 503 }
    );
  }

  const filters = await getCached<FiltersResponse>(
    cacheKeys.filters(),
    CACHE_TTL.FILTERS,
    fetchFiltersFromDB
  );

  // 設定 HTTP Cache-Control header，讓瀏覽器快取 5 分鐘
  return Response.json(filters, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
