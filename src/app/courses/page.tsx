import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { CoursesFilters } from "@/components/CoursesFilters";
import { CourseTable } from "@/components/CourseTable";

type CourseListItem = {
  id: string;
  courseName: string;
  department: string | null;
  campus: string | null;
  year: string;
  term: string;
  time: string | null;
  classroom: string | null;
  instructors: Array<{ instructor: { id: string; name: string } }>;
};

type CoursesPageProps = {
  searchParams?:
    | Promise<{
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

  // Parse semester into year and term (format: "114-1")
  let year: string | undefined;
  let term: string | undefined;
  if (semester) {
    const parts = semester.split('-');
    if (parts.length === 2) {
      year = parts[0];
      term = parts[1];
    }
  }

  const campus = clean(sp.campus);
  const division = clean(sp.division);
  const department = clean(sp.department);

  // 整合舊的 sort/order 與新的 sortBy/sortOrder
  const sortBy = clean(sp.sortBy) || clean(sp.sort) || "updatedAt";
  const sortDirection = clean(sp.sortOrder) || clean(sp.order) || "desc";
  const page = Math.max(1, parseInt(clean(sp.page) || "1", 10));

  // 進階篩選參數
  const minRating = clean(sp.minRating);
  const maxWorkload = clean(sp.maxWorkload);
  const minGrading = clean(sp.minGrading);
  const timeSlot = clean(sp.timeSlot);

  // 保留舊的變數名稱以兼容現有代碼
  const sort = sortBy;
  const order = sortDirection;

  const PER_PAGE = 50;
  const offset = (page - 1) * PER_PAGE;

  if (!prisma) {
    return (
      <div className="app-container">
        <div className="ts-grid is-relaxed">
          <div className="ts-box is-raised">
            <div className="ts-content">
              <div className="ts-header is-large">課程列表</div>
              <div className="app-muted" style={{ marginTop: 12, lineHeight: 1.7 }}>
                先用「搜尋」找到課名/課號,再用「進階篩選」縮小到學年學期、校區、學制與系所。
              </div>
            </div>
          </div>
          <div className="ts-box is-negative is-start-indicated">
            <div className="ts-content">
              <div className="ts-notice is-negative">
                <div className="title">尚未連線資料庫</div>
                <div className="content">
                  目前尚未設定 <code>DATABASE_URL</code>,所以暫時無法載入課程列表。
                  請先在 Zeabur 建立 PostgreSQL,或本機設定連線後再匯入資料。
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const andFilters: Prisma.CourseWhereInput[] = [];
  if (year) andFilters.push({ year });
  if (term) andFilters.push({ term });
  if (campus) andFilters.push({ campus });
  if (division) andFilters.push({ division });
  if (department) andFilters.push({ department });

  // Sort field whitelist for Prisma queries
  const sortFieldMap: Record<string, string> = {
    "updatedAt": "updatedAt",
    "courseName": "courseName",
    "year": "year",
    "department": "department",
    "campus": "campus"
  };

  // Complete ORDER BY clause mapping for raw SQL queries to prevent SQL injection
  // Each combination is pre-defined, no string concatenation needed
  const ORDER_BY_MAP: Record<string, string> = {
    "updatedAt-asc": 'c."updatedAt" ASC',
    "updatedAt-desc": 'c."updatedAt" DESC',
    "courseName-asc": 'c."courseName" ASC',
    "courseName-desc": 'c."courseName" DESC',
    "year-asc": 'c."year" ASC',
    "year-desc": 'c."year" DESC',
    "department-asc": 'c."department" ASC',
    "department-desc": 'c."department" DESC',
    "campus-asc": 'c."campus" ASC',
    "campus-desc": 'c."campus" DESC',
  };

  // Check if sorting by instructor (needs client-side sorting)
  const sortByInstructor = sort === "instructorName";
  const sortField = sortByInstructor ? "updatedAt" : (sortFieldMap[sort] || "updatedAt");
  const sortOrder = order === "asc" ? "asc" : "desc";

  // Get pre-defined ORDER BY clause for raw SQL (prevents string concatenation)
  const sortKey = `${sortField}-${sortOrder}`;
  const baseOrderBy = ORDER_BY_MAP[sortKey] || ORDER_BY_MAP["updatedAt-desc"];

  // Use full-text search if query is provided
  let courses: CourseListItem[];
  let totalCount = 0;

  try {
    if (q && q.length > 0) {
      // Full-text search using PostgreSQL tsvector
      // This is MUCH faster than LIKE '%keyword%'

      // Build dynamic SQL parts
      const conditions: string[] = [`c."searchVector" @@ plainto_tsquery('simple', $1)`];
      const params: any[] = [q];

      if (year) {
        conditions.push(`c.year = $${params.length + 1}`);
        params.push(year);
      }
      if (term) {
        conditions.push(`c.term = $${params.length + 1}`);
        params.push(term);
      }
      if (campus) {
        conditions.push(`c.campus = $${params.length + 1}`);
        params.push(campus);
      }
      if (division) {
        conditions.push(`c.division = $${params.length + 1}`);
        params.push(division);
      }
      if (department) {
        conditions.push(`c.department = $${params.length + 1}`);
        params.push(department);
      }

      // Build ORDER BY clause using pre-defined mappings
      let orderByClause = "";
      if (q && q.length > 0) {
        // When searching, prioritize relevance first, then apply secondary sort
        orderByClause = `ts_rank(c."searchVector", plainto_tsquery('simple', $1)) DESC, ${baseOrderBy}`;
      } else {
        orderByClause = baseOrderBy;
      }

      // Get total count
      const countResult = (await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int as count
        FROM "Course" c
        WHERE ${conditions.join(' AND ')}`,
        ...params
      )) as Array<{ count: number }>;
      totalCount = countResult[0]?.count || 0;

      const rawCourses = (await prisma.$queryRawUnsafe(
        `SELECT
          c.id,
          c."courseName",
          c.department,
          c.campus,
          c.year,
          c.term,
          c.time,
          c.classroom
        FROM "Course" c
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${orderByClause}
        LIMIT ${PER_PAGE} OFFSET ${offset}`,
        ...params
      )) as Array<{
        id: string;
        courseName: string;
        department: string | null;
        campus: string | null;
        year: string;
        term: string;
        time: string | null;
        classroom: string | null;
      }>;

      // Fetch instructors separately for better performance
      const courseIds = rawCourses.map(c => c.id);
      const instructorsData = await prisma.courseInstructor.findMany({
        where: { courseId: { in: courseIds } },
        select: {
          courseId: true,
          instructor: { select: { id: true, name: true } }
        }
      });

      // Group instructors by courseId
      type InstructorItem = { courseId: string; instructor: { id: string; name: string } };
      const instructorsByCourse = instructorsData.reduce(
        (acc: Record<string, Array<{ instructor: { id: string; name: string } }>>, ci: InstructorItem) => {
          if (!acc[ci.courseId]) acc[ci.courseId] = [];
          acc[ci.courseId].push({ instructor: { id: ci.instructor.id, name: ci.instructor.name } });
          return acc;
        },
        {}
      );

      // Combine results
      courses = rawCourses.map(c => ({
        ...c,
        instructors: instructorsByCourse[c.id] || []
      }));
    } else {
      // Regular query without search
      const whereClause = andFilters.length ? { AND: andFilters } : {};

      // Get total count
      totalCount = await prisma.course.count({ where: whereClause });

      courses = await prisma.course.findMany({
        where: whereClause,
        orderBy: { [sortField]: sortOrder },
        skip: offset,
        take: PER_PAGE,
        select: {
          id: true,
          courseName: true,
          department: true,
          campus: true,
          year: true,
          term: true,
          time: true,
          classroom: true,
          instructors: {
            select: {
              instructor: { select: { id: true, name: true } },
            },
          },
        },
      });
    }
  } catch (error) {
    // Database connection error - return empty result
    console.error('Failed to fetch courses:', error);
    courses = [];
  }

  // Client-side sorting for instructor name
  if (sortByInstructor && courses.length > 0) {
    courses.sort((a, b) => {
      const aInstructor = a.instructors[0]?.instructor.name || "";
      const bInstructor = b.instructors[0]?.instructor.name || "";
      const comparison = aInstructor.localeCompare(bInstructor, 'zh-Hant-TW');
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }

  const hasAnyFilter = Boolean(
    q || semester || campus || division || department ||
    minRating || maxWorkload || minGrading || timeSlot
  );
  const totalPages = Math.ceil(totalCount / PER_PAGE);
  const startItem = totalCount === 0 ? 0 : offset + 1;
  const endItem = Math.min(offset + PER_PAGE, totalCount);

  // Helper 函數：產生分頁 query string
  const buildPaginationParams = (pageNum: number) => {
    return new URLSearchParams({
      ...(q && { q }),
      ...(semester && { semester }),
      ...(campus && { campus }),
      ...(division && { division }),
      ...(department && { department }),
      ...(sort && { sort }),
      ...(order && { order }),
      ...(sortBy && { sortBy }),
      ...(sortOrder && { sortOrder }),
      ...(minRating && { minRating }),
      ...(maxWorkload && { maxWorkload }),
      ...(minGrading && { minGrading }),
      ...(timeSlot && { timeSlot }),
      page: pageNum.toString(),
    }).toString();
  };

  return (
    <div className="app-container" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
      {/* Header & Search */}
      <div className="ts-box is-raised" style={{ marginBottom: "2rem", overflow: "visible" }}>
        <div className="ts-content" style={{ padding: "2rem", overflow: "visible" }}>
          <div className="ts-header is-large" style={{ fontSize: "1.875rem", fontWeight: 700, marginBottom: "0.75rem" }}>課程列表</div>
          <div className="app-muted" style={{ fontSize: "1.0625rem", lineHeight: 1.7, marginBottom: "1.5rem" }}>
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

      {/* Results - Hybrid Table Style */}
      <div className={`ts-box is-raised ${hasAnyFilter ? "is-start-indicated" : ""}`}>
        <div style={{ padding: "1.5rem 2rem" }}>
          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ts-gray-600)", marginBottom: "0.25rem" }}>
                  {hasAnyFilter ? "篩選結果" : "所有課程"}
                </div>
                <div style={{ fontSize: "0.875rem", color: "var(--ts-gray-500)" }}>
                  {totalCount === 0 ? "無資料" : `共 ${totalCount} 筆 · 顯示 ${startItem}-${endItem}`}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              {hasAnyFilter && (
                <Link href="/courses" className="ts-button is-small is-ghost" style={{ fontSize: "0.875rem" }}>
                  清除篩選
                </Link>
              )}
            </div>
          </div>

          {courses.length === 0 ? (
            <div className="ts-box is-hollowed">
              <div className="ts-content" style={{ textAlign: "center", padding: "3.5rem 2rem" }}>
                <div style={{ fontSize: "4rem", marginBottom: "1.25rem", lineHeight: 1 }}>📭</div>
                <div className="ts-header is-medium" style={{ fontSize: "1.375rem", fontWeight: 700, marginBottom: "0.75rem" }}>沒有結果</div>
                <div className="app-muted" style={{ fontSize: "1.0625rem", lineHeight: 1.7, maxWidth: 480, margin: "0 auto" }}>
                  目前沒有符合條件的課程。
                  {!hasAnyFilter ? (
                    <>
                      <br />
                      若你已經跑過爬蟲,請再執行 <code>npm run db:import:nkust-ag202</code> 匯入 PostgreSQL。
                    </>
                  ) : null}
                </div>
                {hasAnyFilter ? (
                  <>
                    <div className="ts-space is-large" />
                    <a className="ts-button is-outlined is-large" href="/courses" style={{ fontSize: "1.0625rem" }}>
                      清除篩選再試一次
                    </a>
                  </>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <CourseTable courses={courses} currentSort={sort} currentOrder={order} />

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ marginTop: "2rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  {/* Previous Button */}
                  {page > 1 ? (
                    <Link
                      href={`/courses?${buildPaginationParams(page - 1)}`}
                      className="ts-button is-icon"
                    >
                      ←
                    </Link>
                  ) : (
                    <button className="ts-button is-icon is-disabled" disabled>←</button>
                  )}

                  {/* Page Numbers */}
                  {(() => {
                    const pages: (number | string)[] = [];
                    const showPages = 3; // Show 3 page numbers for better mobile UX

                    if (totalPages <= showPages + 2) {
                      // Show all pages if total is small
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      // Always show first page
                      pages.push(1);

                      let start = Math.max(2, page - 1);
                      let end = Math.min(totalPages - 1, page + 1);

                      // Adjust range if at edges
                      if (page <= 3) {
                        end = Math.min(showPages - 1, totalPages - 1);
                      } else if (page >= totalPages - 2) {
                        start = Math.max(2, totalPages - showPages + 2);
                      }

                      if (start > 2) pages.push("...");

                      for (let i = start; i <= end; i++) {
                        pages.push(i);
                      }

                      if (end < totalPages - 1) pages.push("...");

                      // Always show last page
                      pages.push(totalPages);
                    }

                    return pages.map((p, idx) => {
                      if (p === "...") {
                        return <span key={`ellipsis-${idx}`} style={{ padding: "0 0.5rem", color: "var(--ts-gray-400)" }}>...</span>;
                      }

                      const pageNum = p as number;
                      const isActive = pageNum === page;

                      if (isActive) {
                        return (
                          <button
                            key={pageNum}
                            className="ts-button is-secondary"
                            disabled
                            style={{ minWidth: "3rem", padding: "0.625rem 1rem" }}
                          >
                            {pageNum}
                          </button>
                        );
                      }

                      return (
                        <Link
                          key={pageNum}
                          href={`/courses?${buildPaginationParams(pageNum)}`}
                          className="ts-button"
                          style={{ minWidth: "3rem", padding: "0.625rem 1rem" }}
                        >
                          {pageNum}
                        </Link>
                      );
                    });
                  })()}

                  {/* Next Button */}
                  {page < totalPages ? (
                    <Link
                      href={`/courses?${buildPaginationParams(page + 1)}`}
                      className="ts-button is-icon"
                    >
                      →
                    </Link>
                  ) : (
                    <button className="ts-button is-icon is-disabled" disabled>→</button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
