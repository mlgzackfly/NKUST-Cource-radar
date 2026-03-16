import { Suspense } from "react";
// @ts-expect-error - Next.js 15.5.9 type definition issue
import type { Metadata } from "next";
import { CoursesFilters } from "@/components/CoursesFilters";
import { CoursesList, CoursesListSkeleton } from "@/components/CoursesList";

const baseUrl = process.env.NEXTAUTH_URL || "https://nkust.zeabur.app";

export async function generateMetadata({
  searchParams,
}: CoursesPageProps): Promise<Metadata> {
  const sp = (await searchParams) ?? {};
  const q = sp.q?.trim();
  const department = sp.department?.trim();

  let title = "課程列表";
  let description =
    "搜尋高雄科技大學所有課程，查看評價、涼度指數、給分甜度等資訊，幫助你做出更好的選課決定。";

  if (q) {
    title = `「${q}」搜尋結果`;
    description = `搜尋「${q}」的高科大課程結果，包含課程評價與詳細資訊。`;
  } else if (department) {
    title = `${department} 課程列表`;
    description = `查看高雄科技大學${department}的所有課程、評價與教師資訊。`;
  }

  return {
    title,
    description,
    openGraph: {
      title: `${title} | 高科選課雷達`,
      description,
      url: `${baseUrl}/courses`,
      siteName: "高科選課雷達",
      locale: "zh_TW",
      type: "website",
    },
    alternates: {
      canonical: `${baseUrl}/courses`,
    },
  };
}

type CoursesPageProps = {
  searchParams?: Promise<{
    q?: string;
    semester?: string;
    campus?: string;
    division?: string;
    department?: string;
    sort?: string;
    order?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: string;
    minRating?: string;
    maxWorkload?: string;
    minGrading?: string;
    timeSlot?: string;
  }>;
};

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const sp = (await searchParams) ?? {};
  const clean = (v: string | undefined) => (v ? v.trim() : undefined) || undefined;
  const q = clean(sp.q);
  const semester = clean(sp.semester);

  let year: string | undefined;
  let term: string | undefined;
  if (semester) {
    const parts = semester.split("-");
    if (parts.length === 2) {
      year = parts[0];
      term = parts[1];
    }
  }

  const campus = clean(sp.campus);
  const division = clean(sp.division);
  const department = clean(sp.department);
  const sortBy = clean(sp.sortBy) || clean(sp.sort) || "semester";
  const sortOrder = clean(sp.sortOrder) || clean(sp.order) || "desc";
  const page = Math.max(1, parseInt(clean(sp.page) || "1", 10));
  const minRating = clean(sp.minRating);
  const maxWorkload = clean(sp.maxWorkload);
  const minGrading = clean(sp.minGrading);
  const timeSlot = clean(sp.timeSlot);

  const hasAnyFilter = Boolean(
    q || semester || campus || division || department || minRating || maxWorkload || minGrading || timeSlot
  );

  return (
    <div className="app-container" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
      {/* Header & Search - 立即顯示 */}
      <div className="ts-box is-raised" style={{ marginBottom: "2rem", overflow: "visible" }}>
        <div className="ts-content" style={{ padding: "2rem", overflow: "visible" }}>
          <div
            className="ts-header is-large"
            style={{ fontSize: "1.875rem", fontWeight: 700, marginBottom: "0.75rem" }}
          >
            課程列表
          </div>
          <div
            className="app-muted"
            style={{ fontSize: "1.0625rem", lineHeight: 1.7, marginBottom: "1.5rem" }}
          >
            先用關鍵字搜尋,再用進階篩選縮小範圍。
          </div>
          <CoursesFilters
            initial={{
              q,
              campus,
              division,
              department,
              sortBy,
              sortOrder,
              minRating,
              maxWorkload,
              minGrading,
              timeSlot,
            }}
          />
        </div>
      </div>

      {/* Results - Streaming 載入 */}
      <div className={`ts-box is-raised ${hasAnyFilter ? "is-start-indicated" : ""}`}>
        <div style={{ padding: "1.5rem 2rem" }}>
          <Suspense fallback={<CoursesListSkeleton />}>
            <CoursesList
              q={q}
              year={year}
              term={term}
              campus={campus}
              division={division}
              department={department}
              sort={sortBy}
              order={sortOrder}
              page={page}
              minRating={minRating}
              maxWorkload={maxWorkload}
              minGrading={minGrading}
              timeSlot={timeSlot}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
