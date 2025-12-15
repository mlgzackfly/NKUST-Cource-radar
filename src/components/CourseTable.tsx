"use client";

import Link from "next/link";

type CourseListItem = {
  id: string;
  courseName: string;
  department: string | null;
  campus: string | null;
  year: string;
  term: string;
  instructors: Array<{ instructor: { name: string } }>;
};

export function CourseTable({ courses }: { courses: CourseListItem[] }) {
  return (
    <div style={{ overflow: "auto" }}>
      {/* Table view - Notion/Airtable style */}
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--ts-gray-200)" }}>
            <th style={{
              padding: "0.75rem 1rem",
              textAlign: "left",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--ts-gray-600)",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}>
              課程名稱
            </th>
            <th style={{
              padding: "0.75rem 1rem",
              textAlign: "left",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--ts-gray-600)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              minWidth: "150px"
            }}>
              教師
            </th>
            <th style={{
              padding: "0.75rem 1rem",
              textAlign: "left",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--ts-gray-600)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              minWidth: "120px"
            }}>
              系所
            </th>
            <th style={{
              padding: "0.75rem 1rem",
              textAlign: "center",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--ts-gray-600)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              minWidth: "100px"
            }}>
              學期
            </th>
            <th style={{
              padding: "0.75rem 1rem",
              textAlign: "center",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--ts-gray-600)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              minWidth: "90px"
            }}>
              校區
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
