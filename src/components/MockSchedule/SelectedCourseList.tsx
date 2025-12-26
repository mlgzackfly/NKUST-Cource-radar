"use client";

import type { SelectedCourse, ConflictMap } from "@/types/mockSchedule";
import { getConflictMessage } from "@/lib/scheduleConflict";

type SelectedCourseListProps = {
  selectedCourses: SelectedCourse[];
  conflicts: ConflictMap;
  onRemoveCourse: (courseId: string) => void;
};

export function SelectedCourseList({
  selectedCourses,
  conflicts,
  onRemoveCourse,
}: SelectedCourseListProps) {
  return (
    <div style={{ overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--ts-gray-300)" }}>
            <th
              style={{
                padding: "0.75rem 1rem",
                textAlign: "left",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--ts-gray-600)",
                textTransform: "uppercase",
              }}
            >
              課程名稱
            </th>
            <th
              style={{
                padding: "0.75rem 1rem",
                textAlign: "left",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--ts-gray-600)",
                textTransform: "uppercase",
              }}
            >
              教師
            </th>
            <th
              style={{
                padding: "0.75rem 1rem",
                textAlign: "center",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--ts-gray-600)",
                textTransform: "uppercase",
              }}
            >
              學分
            </th>
            <th
              style={{
                padding: "0.75rem 1rem",
                textAlign: "left",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--ts-gray-600)",
                textTransform: "uppercase",
              }}
            >
              時間
            </th>
            <th
              style={{
                padding: "0.75rem 1rem",
                textAlign: "center",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--ts-gray-600)",
                textTransform: "uppercase",
                width: "80px",
              }}
            >
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          {selectedCourses.map((course, index) => {
            const hasConflict = conflicts[course.id]?.length > 0;
            const conflictMessage = getConflictMessage(course.id, conflicts, selectedCourses);

            return (
              <tr
                key={course.id}
                style={{
                  borderBottom:
                    index < selectedCourses.length - 1 ? "1px solid var(--ts-gray-200)" : "none",
                }}
              >
                <td style={{ padding: "1rem", fontSize: "0.9375rem" }}>
                  <div style={{ fontWeight: 600 }}>{course.courseName}</div>
                  {hasConflict && (
                    <div
                      className="ts-text is-negative"
                      style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}
                    >
                      ⚠️ {conflictMessage}
                    </div>
                  )}
                </td>
                <td style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--ts-gray-700)" }}>
                  {course.instructorNames.join("、") || "—"}
                </td>
                <td
                  style={{
                    padding: "1rem",
                    fontSize: "0.875rem",
                    color: "var(--ts-gray-700)",
                    textAlign: "center",
                  }}
                >
                  {course.credits || "—"}
                </td>
                <td style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--ts-gray-600)" }}>
                  {course.time || "—"}
                </td>
                <td style={{ padding: "1rem", textAlign: "center" }}>
                  <button
                    onClick={() => onRemoveCourse(course.id)}
                    className="ts-button is-small is-ghost is-negative"
                  >
                    移除
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
