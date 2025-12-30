import { Suspense } from "react";
import { CoursesFilters } from "@/components/CoursesFilters";
import { CoursesList, CoursesListSkeleton } from "@/components/CoursesList";

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
