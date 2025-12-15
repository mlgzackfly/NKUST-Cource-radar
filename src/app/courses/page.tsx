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
  instructors: Array<{ instructor: { name: string } }>;
};

type CoursesPageProps = {
  searchParams?:
    | Promise<{
        q?: string;
        year?: string;
        term?: string;
        campus?: string;
        division?: string;
        department?: string;
        sort?: string;
        order?: string;
      }>;
};

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const sp = (await searchParams) ?? {};
  const clean = (v: string | undefined) => (v ? v.trim() : undefined) || undefined;
  const q = clean(sp.q);
  const year = clean(sp.year);
  const term = clean(sp.term);
  const campus = clean(sp.campus);
  const division = clean(sp.division);
  const department = clean(sp.department);
  const sort = clean(sp.sort) || "updatedAt";
  const order = clean(sp.order) || "desc";

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

  // Sort field mapping (instructorName will be handled client-side)
  const sortFieldMap: Record<string, string> = {
    "updatedAt": "updatedAt",
    "courseName": "courseName",
    "year": "year",
    "department": "department",
    "campus": "campus"
  };

  // Check if sorting by instructor (needs client-side sorting)
  const sortByInstructor = sort === "instructorName";
  const sortField = sortByInstructor ? "updatedAt" : (sortFieldMap[sort] || "updatedAt");
  const sortOrder = order === "asc" ? "asc" : "desc";

  // Use full-text search if query is provided
  let courses: CourseListItem[];

  try {
    if (q && q.length > 0) {
      // Full-text search using PostgreSQL tsvector
      // This is MUCH faster than LIKE '%keyword%'

      // Build dynamic SQL parts
      const conditions: string[] = [`c."searchVector" @@ plainto_tsquery('simple', ${q})`];
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

      // Build ORDER BY clause
      let orderByClause = "";
      if (q && q.length > 0) {
        // When searching, prioritize relevance first
        orderByClause = `ts_rank(c."searchVector", plainto_tsquery('simple', $1)) DESC, c."${sortField}" ${sortOrder.toUpperCase()}`;
      } else {
        orderByClause = `c."${sortField}" ${sortOrder.toUpperCase()}`;
      }

      const rawCourses = (await prisma.$queryRawUnsafe(
        `SELECT
          c.id,
          c."courseName",
          c.department,
          c.campus,
          c.year,
          c.term
        FROM "Course" c
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${orderByClause}
        LIMIT 50`,
        ...params
      )) as Array<{
        id: string;
        courseName: string;
        department: string | null;
        campus: string | null;
        year: string;
        term: string;
      }>;

      // Fetch instructors separately for better performance
      const courseIds = rawCourses.map(c => c.id);
      const instructorsData = await prisma.courseInstructor.findMany({
        where: { courseId: { in: courseIds } },
        select: {
          courseId: true,
          instructor: { select: { name: true } }
        }
      });

      // Group instructors by courseId
      type InstructorItem = { courseId: string; instructor: { name: string } };
      const instructorsByCourse = instructorsData.reduce(
        (acc: Record<string, Array<{ instructor: { name: string } }>>, ci: InstructorItem) => {
          if (!acc[ci.courseId]) acc[ci.courseId] = [];
          acc[ci.courseId].push({ instructor: { name: ci.instructor.name } });
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
      courses = await prisma.course.findMany({
        where: andFilters.length ? { AND: andFilters } : {},
        orderBy: { [sortField]: sortOrder },
        take: 50,
        select: {
          id: true,
          courseName: true,
          department: true,
          campus: true,
          year: true,
          term: true,
          instructors: {
            select: {
              instructor: { select: { name: true } },
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

  const hasAnyFilter = Boolean(q || year || term || campus || division || department);

  return (
    <div className="app-container" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
      {/* Header & Search */}
      <div className="ts-box is-raised" style={{ marginBottom: "2rem" }}>
        <div className="ts-content" style={{ padding: "2rem" }}>
          <div className="ts-header is-large" style={{ fontSize: "1.875rem", fontWeight: 700, marginBottom: "0.75rem" }}>課程列表</div>
          <div className="app-muted" style={{ fontSize: "1.0625rem", lineHeight: 1.7, marginBottom: "1.5rem" }}>
            先用關鍵字搜尋,再用進階篩選縮小範圍。
          </div>
          <CoursesFilters
            initial={{
              q,
              year,
              term,
              campus,
              division,
              department,
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
                  {courses.length === 0 ? "無資料" : `${courses.length} 筆${courses.length === 50 ? " · 僅顯示前 50 筆" : ""}`}
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
            <CourseTable courses={courses} currentSort={sort} currentOrder={order} />
          )}
        </div>
      </div>
    </div>
  );
}
