"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type CourseListItem = {
  id: string;
  courseName: string;
  department: string | null;
  campus: string | null;
  year: string;
  term: string;
  instructors: Array<{ instructor: { name: string } }>;
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
    transition: "background-color 0.15s"
  });

  return (
    <div style={{ overflow: "auto" }}>
      {/* Table view - Notion/Airtable style */}
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--ts-gray-200)" }}>
            <th
              style={headerStyle(true)}
              onClick={() => handleSort("courseName")}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--ts-gray-50)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              課程名稱{getSortIcon("courseName")}
            </th>
            <th
              style={{ ...headerStyle(true), minWidth: "150px" }}
              onClick={() => handleSort("instructorName")}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--ts-gray-50)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              教師{getSortIcon("instructorName")}
            </th>
            <th
              style={{ ...headerStyle(true), minWidth: "120px" }}
              onClick={() => handleSort("department")}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--ts-gray-50)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              系所{getSortIcon("department")}
            </th>
            <th
              style={{ ...headerStyle(true), textAlign: "center", minWidth: "100px" }}
              onClick={() => handleSort("year")}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--ts-gray-50)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              學期{getSortIcon("year")}
            </th>
            <th
              style={{ ...headerStyle(true), textAlign: "center", minWidth: "90px" }}
              onClick={() => handleSort("campus")}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--ts-gray-50)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              校區{getSortIcon("campus")}
            </th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c, index) => {
            const instructors = c.instructors.map((x) => x.instructor.name).join("、");
            return (
              <tr
                key={c.id}
                onClick={() => window.location.href = `/courses/${c.id}`}
                style={{
                  borderBottom: index < courses.length - 1 ? "1px solid var(--ts-gray-150)" : "none",
                  cursor: "pointer",
                  transition: "background-color 0.15s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--ts-gray-50)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <td style={{ padding: "1rem", fontSize: "0.9375rem", fontWeight: 600, color: "var(--ts-gray-900)" }}>
                  {c.courseName}
                </td>
                <td style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--ts-gray-700)" }}>
                  {instructors || "—"}
                </td>
                <td style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--ts-gray-600)" }}>
                  {c.department || "—"}
                </td>
                <td style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--ts-gray-600)", textAlign: "center" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "0.25rem 0.625rem",
                    background: "var(--ts-gray-100)",
                    borderRadius: "4px",
                    fontSize: "0.8125rem",
                    fontWeight: 600
                  }}>
                    {c.year}-{c.term}
                  </span>
                </td>
                <td style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--ts-gray-600)", textAlign: "center" }}>
                  {c.campus || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
