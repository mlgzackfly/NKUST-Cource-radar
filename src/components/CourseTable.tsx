"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CompareButton, CompareFloatingBar } from "./CompareButton";

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

type CourseTableProps = {
  courses: CourseListItem[];
  currentSort: string;
  currentOrder: string;
};

export function CourseTable({ courses, currentSort, currentOrder }: CourseTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSort = (field: string) => {
    const params = new URLSearchParams(searchParams.toString());

    // If clicking the same field, toggle order
    if (currentSort === field) {
      const newOrder = currentOrder === "asc" ? "desc" : "asc";
      params.set("order", newOrder);
    } else {
      // If clicking a different field, set it and default to desc
      params.set("sort", field);
      params.set("order", "desc");
    }

    router.push(`/courses?${params.toString()}`);
  };

  const getSortIcon = (field: string) => {
    if (currentSort !== field) return null;
    return currentOrder === "asc" ? " ↑" : " ↓";
  };

  const headerStyle = (sortable: boolean) => ({
    padding: "0.75rem 1rem",
    textAlign: "left" as const,
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--ts-gray-600)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    cursor: sortable ? "pointer" : "default",
    userSelect: "none" as const,
    transition: "background-color 0.15s",
  });

  const renderInstructors = (instructors: Array<{ instructor: { id: string; name: string } }>) => {
    if (!instructors || instructors.length === 0) return <span>—</span>;

    const displayInstructors = instructors.length <= 2 ? instructors : instructors.slice(0, 2);
    const hasMore = instructors.length > 2;

    return (
      <span>
        {displayInstructors.map((item, index) => (
          <span key={item.instructor.id}>
            <Link
              href={`/instructors/${item.instructor.id}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                color: "var(--ts-primary-500)",
                textDecoration: "none",
                fontWeight: 500,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
            >
              {item.instructor.name}
            </Link>
            {index < displayInstructors.length - 1 && "、"}
          </span>
        ))}
        {hasMore && "..."}
      </span>
    );
  };

  // Mobile Card View Component
  function CourseCard({ course }: { course: CourseListItem }) {
    return (
      <div
        onClick={() => router.push(`/courses/${course.id}`)}
        style={{
          backgroundColor: "var(--app-surface)",
          border: "1px solid var(--app-border)",
          borderRadius: "12px",
          padding: "1rem",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--app-table-hover-bg)";
          e.currentTarget.style.borderColor = "var(--ts-primary-500)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "var(--app-surface)";
          e.currentTarget.style.borderColor = "var(--app-border)";
        }}
      >
        {/* 課程名稱 */}
        <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.5rem" }}>
          {course.courseName}
        </div>

        {/* 系所與校區 */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          {course.department && (
            <span
              style={{
                fontSize: "0.75rem",
                padding: "0.25rem 0.5rem",
                backgroundColor: "color-mix(in srgb, var(--ts-warning-500) 15%, transparent)",
                color: "var(--ts-warning-600)",
                borderRadius: "4px",
                fontWeight: 500,
              }}
            >
              {course.department}
            </span>
          )}
          {course.campus && (
            <span
              style={{
                fontSize: "0.75rem",
                padding: "0.25rem 0.5rem",
                backgroundColor: "color-mix(in srgb, var(--ts-info-500) 15%, transparent)",
                color: "var(--ts-info-600)",
                borderRadius: "4px",
              }}
            >
              {course.campus}
            </span>
          )}
        </div>

        {/* 教師 */}
        <div
          style={{
            fontSize: "0.875rem",
            color: "var(--app-text)",
            marginBottom: "0.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span style={{ color: "var(--app-muted)", minWidth: "3rem" }}>教師</span>
          <span>
            {course.instructors && course.instructors.length > 0
              ? course.instructors.map((item, index) => (
                  <span key={item.instructor.id}>
                    <span style={{ color: "var(--ts-primary-500)", fontWeight: 500 }}>
                      {item.instructor.name}
                    </span>
                    {index < course.instructors.length - 1 && "、"}
                  </span>
                ))
              : "—"}
          </span>
        </div>

        {/* 時間與教室 */}
        {course.time && (
          <div
            style={{
              fontSize: "0.875rem",
              color: "var(--app-text)",
              marginBottom: "0.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span style={{ color: "var(--app-muted)", minWidth: "3rem" }}>時間</span>
            <span>{course.time}</span>
          </div>
        )}

        {course.classroom && (
          <div
            style={{
              fontSize: "0.875rem",
              color: "var(--app-text)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span style={{ color: "var(--app-muted)", minWidth: "3rem" }}>教室</span>
            <span>{course.classroom}</span>
          </div>
        )}

        {/* 比較按鈕 */}
        <div
          style={{
            marginTop: "0.75rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid var(--app-border)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <CompareButton courseId={course.id} courseName={course.courseName} variant="button" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="mobile-course-cards" style={{ display: "none" }}>
        <div style={{ display: "grid", gap: "1rem" }}>
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="desktop-course-table" style={{ overflow: "auto" }}>
        {/* Table view - Notion/Airtable style */}
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--app-table-border)" }}>
              <th
                style={headerStyle(true)}
                onClick={() => handleSort("courseName")}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--app-table-hover-bg)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                課程名稱{getSortIcon("courseName")}
              </th>
              <th
                style={{ ...headerStyle(true), minWidth: "150px" }}
                onClick={() => handleSort("instructorName")}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--app-table-hover-bg)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                教師{getSortIcon("instructorName")}
              </th>
              <th style={{ ...headerStyle(false), minWidth: "100px" }}>上課時間</th>
              <th style={{ ...headerStyle(false), minWidth: "90px" }}>教室</th>
              <th
                style={{ ...headerStyle(true), minWidth: "120px" }}
                onClick={() => handleSort("department")}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--app-table-hover-bg)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                系所{getSortIcon("department")}
              </th>
              <th
                style={{ ...headerStyle(true), textAlign: "center", minWidth: "100px" }}
                onClick={() => handleSort("year")}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--app-table-hover-bg)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                學期{getSortIcon("year")}
              </th>
              <th
                style={{ ...headerStyle(true), textAlign: "center", minWidth: "90px" }}
                onClick={() => handleSort("campus")}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--app-table-hover-bg)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                校區{getSortIcon("campus")}
              </th>
              <th style={{ ...headerStyle(false), textAlign: "center", minWidth: "60px" }}>比較</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c, index) => {
              return (
                <tr
                  key={c.id}
                  onClick={() => (window.location.href = `/courses/${c.id}`)}
                  style={{
                    borderBottom:
                      index < courses.length - 1 ? "1px solid var(--app-table-border)" : "none",
                    cursor: "pointer",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--app-table-hover-bg)")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <td
                    style={{
                      padding: "1rem",
                      fontSize: "0.9375rem",
                      fontWeight: 600,
                      color: "var(--ts-gray-900)",
                    }}
                  >
                    {c.courseName}
                  </td>
                  <td
                    style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--ts-gray-700)" }}
                  >
                    {renderInstructors(c.instructors)}
                  </td>
                  <td
                    style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--ts-gray-600)" }}
                  >
                    {c.time || "—"}
                  </td>
                  <td
                    style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--ts-gray-600)" }}
                  >
                    {c.classroom || "—"}
                  </td>
                  <td
                    style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--ts-gray-600)" }}
                  >
                    {c.department || "—"}
                  </td>
                  <td
                    style={{
                      padding: "1rem",
                      fontSize: "0.875rem",
                      color: "var(--ts-gray-600)",
                      textAlign: "center",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.25rem 0.625rem",
                        background: "var(--ts-gray-100)",
                        borderRadius: "4px",
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                      }}
                    >
                      {c.year}-{c.term}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "1rem",
                      fontSize: "0.875rem",
                      color: "var(--ts-gray-600)",
                      textAlign: "center",
                    }}
                  >
                    {c.campus || "—"}
                  </td>
                  <td
                    style={{ padding: "0.5rem", textAlign: "center" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CompareButton courseId={c.id} courseName={c.courseName} variant="icon" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 浮動比較列 */}
      <CompareFloatingBar />
    </>
  );
}
