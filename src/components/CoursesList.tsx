import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
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

interface CoursesListProps {
  q?: string;
  year?: string;
  term?: string;
  campus?: string;
  division?: string;
  department?: string;
  sort: string;
  order: string;
  page: number;
}

const PER_PAGE = 50;

export async function CoursesList({
  q,
  year,
  term,
  campus,
  division,
  department,
  sort,
  order,
  page,
}: CoursesListProps) {
  if (!prisma) {
    return (
      <div className="ts-box is-negative is-start-indicated">
        <div className="ts-content">
          <div className="ts-notice is-negative">
            <div className="title">尚未連線資料庫</div>
          </div>
        </div>
      </div>
    );
  }

  const offset = (page - 1) * PER_PAGE;
  const andFilters: Prisma.CourseWhereInput[] = [];
  if (year) andFilters.push({ year });
  if (term) andFilters.push({ term });
  if (campus) andFilters.push({ campus });
  if (division) andFilters.push({ division });
  if (department) andFilters.push({ department });

  const sortFieldMap: Record<string, string> = {
    updatedAt: "updatedAt",
    courseName: "courseName",
    year: "year",
    semester: "semester",
    department: "department",
    campus: "campus",
  };

  const ORDER_BY_MAP: Record<string, string> = {
    "updatedAt-asc": 'c."updatedAt" ASC',
    "updatedAt-desc": 'c."updatedAt" DESC',
    "courseName-asc": 'c."courseName" ASC',
    "courseName-desc": 'c."courseName" DESC',
    "year-asc": 'c."year" ASC',
    "year-desc": 'c."year" DESC',
    "semester-asc": 'c."year" ASC, c."term" ASC',
    "semester-desc": 'c."year" DESC, c."term" DESC',
    "department-asc": 'c."department" ASC',
    "department-desc": 'c."department" DESC',
    "campus-asc": 'c."campus" ASC',
    "campus-desc": 'c."campus" DESC',
  };

  const sortByInstructor = sort === "instructorName";
  const sortBySemester = sort === "semester";
  const sortField = sortByInstructor || sortBySemester ? "semester" : sortFieldMap[sort] || "semester";
  const sortOrder = order === "asc" ? "asc" : "desc";
  const sortKey = `${sortField}-${sortOrder}`;
  const baseOrderBy = ORDER_BY_MAP[sortKey] || ORDER_BY_MAP["semester-desc"];

  let courses: CourseListItem[];
  let totalCount = 0;

  try {
    if (q && q.length > 0) {
      const conditions: string[] = [`c."searchVector" @@ plainto_tsquery('simple', $1)`];
      const params: unknown[] = [q];

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

      const orderByClause = `ts_rank(c."searchVector", plainto_tsquery('simple', $1)) DESC, ${baseOrderBy}`;

      type RawCourse = {
        id: string;
        courseName: string;
        department: string | null;
        campus: string | null;
        year: string;
        term: string;
        time: string | null;
        classroom: string | null;
      };

      // Run count and data queries in parallel
      const [countResult, rawCourses] = await Promise.all([
        prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::int as count FROM "Course" c WHERE ${conditions.join(" AND ")}`,
          ...params
        ) as Promise<Array<{ count: number }>>,
        prisma.$queryRawUnsafe(
          `SELECT c.id, c."courseName", c.department, c.campus, c.year, c.term, c.time, c.classroom
           FROM "Course" c
           WHERE ${conditions.join(" AND ")}
           ORDER BY ${orderByClause}
           LIMIT ${PER_PAGE} OFFSET ${offset}`,
          ...params
        ) as Promise<RawCourse[]>,
      ]);

      totalCount = countResult[0]?.count || 0;

      const courseIds = rawCourses.map((c: RawCourse) => c.id);
      const instructorsData = await prisma.courseInstructor.findMany({
        where: { courseId: { in: courseIds } },
        select: {
          courseId: true,
          instructor: { select: { id: true, name: true } },
        },
      });

      type InstructorItem = { courseId: string; instructor: { id: string; name: string } };
      const instructorsByCourse = instructorsData.reduce(
        (acc: Record<string, Array<{ instructor: { id: string; name: string } }>>, ci: InstructorItem) => {
          if (!acc[ci.courseId]) acc[ci.courseId] = [];
          acc[ci.courseId].push({ instructor: ci.instructor });
          return acc;
        },
        {}
      );

      courses = rawCourses.map((c: RawCourse) => ({
        ...c,
        instructors: instructorsByCourse[c.id] || [],
      }));
    } else {
      const whereClause = andFilters.length ? { AND: andFilters } : {};

      // Build orderBy based on sort field
      const orderBy = sortBySemester
        ? [{ year: sortOrder as "asc" | "desc" }, { term: sortOrder as "asc" | "desc" }]
        : { [sortField]: sortOrder };

      // Run count and data queries in parallel
      const [count, data] = await Promise.all([
        prisma.course.count({ where: whereClause }),
        prisma.course.findMany({
          where: whereClause,
          orderBy,
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
        }),
      ]);

      totalCount = count;
      courses = data;
    }
  } catch (error) {
    console.error("Failed to fetch courses:", error);
    courses = [];
  }

  if (sortByInstructor && courses.length > 0) {
    courses.sort((a, b) => {
      const aInstructor = a.instructors[0]?.instructor.name || "";
      const bInstructor = b.instructors[0]?.instructor.name || "";
      const comparison = aInstructor.localeCompare(bInstructor, "zh-Hant-TW");
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }

  const hasAnyFilter = Boolean(q || year || term || campus || division || department);
  const totalPages = Math.ceil(totalCount / PER_PAGE);
  const startItem = totalCount === 0 ? 0 : offset + 1;
  const endItem = Math.min(offset + PER_PAGE, totalCount);

  const buildPaginationParams = (pageNum: number) => {
    const semester = year && term ? `${year}-${term}` : undefined;
    return new URLSearchParams({
      ...(q && { q }),
      ...(semester && { semester }),
      ...(campus && { campus }),
      ...(division && { division }),
      ...(department && { department }),
      ...(sort && { sortBy: sort }),
      ...(order && { sortOrder: order }),
      page: pageNum.toString(),
    }).toString();
  };

  return (
    <>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div>
            <div
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--ts-gray-600)",
                marginBottom: "0.25rem",
              }}
            >
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
            <div
              className="ts-header is-medium"
              style={{ fontSize: "1.375rem", fontWeight: 700, marginBottom: "0.75rem" }}
            >
              沒有結果
            </div>
            <div
              className="app-muted"
              style={{ fontSize: "1.0625rem", lineHeight: 1.7, maxWidth: 480, margin: "0 auto" }}
            >
              目前沒有符合條件的課程。
            </div>
            {hasAnyFilter && (
              <>
                <div className="ts-space is-large" />
                <a className="ts-button is-outlined is-large" href="/courses" style={{ fontSize: "1.0625rem" }}>
                  清除篩選再試一次
                </a>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <CourseTable courses={courses} currentSort={sort} currentOrder={order} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                marginTop: "2rem",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              {page > 1 ? (
                <Link href={`/courses?${buildPaginationParams(page - 1)}`} className="ts-button is-icon">
                  ←
                </Link>
              ) : (
                <button className="ts-button is-icon is-disabled" disabled>
                  ←
                </button>
              )}

              {(() => {
                const pages: (number | string)[] = [];
                const showPages = 3;

                if (totalPages <= showPages + 2) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  let start = Math.max(2, page - 1);
                  let end = Math.min(totalPages - 1, page + 1);

                  if (page <= 3) end = Math.min(showPages - 1, totalPages - 1);
                  else if (page >= totalPages - 2) start = Math.max(2, totalPages - showPages + 2);

                  if (start > 2) pages.push("...");
                  for (let i = start; i <= end; i++) pages.push(i);
                  if (end < totalPages - 1) pages.push("...");
                  pages.push(totalPages);
                }

                return pages.map((p, idx) => {
                  if (p === "...") {
                    return (
                      <span key={`ellipsis-${idx}`} style={{ padding: "0 0.5rem", color: "var(--ts-gray-400)" }}>
                        ...
                      </span>
                    );
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

              {page < totalPages ? (
                <Link href={`/courses?${buildPaginationParams(page + 1)}`} className="ts-button is-icon">
                  →
                </Link>
              ) : (
                <button className="ts-button is-icon is-disabled" disabled>
                  →
                </button>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}

export function CoursesListSkeleton() {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <div
            className="ts-loading is-small"
            style={{ width: "80px", height: "14px", marginBottom: "0.5rem" }}
          />
          <div className="ts-loading is-small" style={{ width: "120px", height: "14px" }} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="ts-loading"
            style={{ width: "100%", height: "48px", borderRadius: "6px" }}
          />
        ))}
      </div>
    </>
  );
}
