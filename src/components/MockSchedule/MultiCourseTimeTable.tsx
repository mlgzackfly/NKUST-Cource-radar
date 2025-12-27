"use client";

import { parseCourseTime, TIME_PERIODS, type PeriodKey } from "@/lib/courseTimeParser";
import type { SelectedCourse, ConflictMap } from "@/types/mockSchedule";

type MultiCourseTimeTableProps = {
  selectedCourses: SelectedCourse[];
  conflicts: ConflictMap;
};

type CourseSlot = {
  course: SelectedCourse;
  isConflict: boolean;
};

export function MultiCourseTimeTable({ selectedCourses, conflicts }: MultiCourseTimeTableProps) {
  // 解析所有課程的時間槽
  const coursesWithSlots = selectedCourses.map((course) => ({
    course,
    slots: course.time ? parseCourseTime(course.time) : [],
  }));

  // 檢查是否需要顯示夜間課程（10-13 節）
  const hasNightCourses = coursesWithSlots.some((c) =>
    c.slots.some((slot) => slot.periods.some((p) => [10, 11, 12, 13].includes(Number(p))))
  );

  // 建立課表網格資料結構
  const periods: PeriodKey[] = hasNightCourses
    ? ["M", 1, 2, 3, 4, "A", 5, 6, 7, 8, 9, 10, 11, 12, 13]
    : ["M", 1, 2, 3, 4, "A", 5, 6, 7, 8, 9];

  const days = [
    { key: 1, label: "一" },
    { key: 2, label: "二" },
    { key: 3, label: "三" },
    { key: 4, label: "四" },
    { key: 5, label: "五" },
  ];

  // 建立 day x period 的課程映射
  const grid: Record<number, Record<PeriodKey, CourseSlot[]>> = {};
  days.forEach((day) => {
    grid[day.key] = {} as Record<PeriodKey, CourseSlot[]>;
    periods.forEach((period) => {
      grid[day.key][period] = [];
    });
  });

  // 填入課程
  coursesWithSlots.forEach(({ course, slots }) => {
    const isConflict = Boolean(conflicts[course.id] && conflicts[course.id].length > 0);

    slots.forEach((slot) => {
      slot.periods.forEach((period) => {
        if (grid[slot.day] && grid[slot.day][period as PeriodKey]) {
          grid[slot.day][period as PeriodKey].push({ course, isConflict });
        }
      });
    });
  });

  return (
    <div style={{ overflow: "auto" }} className="schedule-table-wrapper">
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #d1d5db" }}>
            <th
              className="period-column"
              style={{
                padding: "0.5rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#4b5563",
                textAlign: "center",
                width: "60px",
              }}
            >
              節次
            </th>
            {days.map((day) => (
              <th
                key={day.key}
                className="day-column"
                style={{
                  padding: "0.5rem",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#4b5563",
                  textAlign: "center",
                }}
              >
                週{day.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => {
            const periodInfo = TIME_PERIODS[period];
            return (
              <tr key={period} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td
                  style={{
                    padding: "0.5rem",
                    fontSize: "0.75rem",
                    color: "#4b5563",
                    textAlign: "center",
                    verticalAlign: "top",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{period}</div>
                  <div style={{ fontSize: "0.688rem" }}>
                    {periodInfo.start}
                    <br />
                    {periodInfo.end}
                  </div>
                </td>
                {days.map((day) => {
                  const courses = grid[day.key][period];
                  return (
                    <td
                      key={day.key}
                      style={{
                        padding: "0.25rem",
                        verticalAlign: "top",
                        minHeight: "60px",
                      }}
                    >
                      {courses.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          {courses.map((courseSlot, index) => (
                            <div
                              key={index}
                              title={`${courseSlot.course.courseName}\n${
                                courseSlot.course.instructorNames.join("、") || "—"
                              }\n${courseSlot.course.classroom || "—"}`}
                              style={{
                                padding: "0.5rem",
                                fontSize: "0.75rem",
                                borderRadius: "4px",
                                background: courseSlot.isConflict
                                  ? "rgba(239, 68, 68, 0.15)"
                                  : "rgba(59, 130, 246, 0.12)",
                                border: courseSlot.isConflict
                                  ? "2px solid #ef4444"
                                  : "1px solid #93c5fd",
                                position: "relative",
                                cursor: "pointer",
                              }}
                            >
                              {courseSlot.isConflict && (
                                <span
                                  style={{
                                    position: "absolute",
                                    top: "2px",
                                    right: "2px",
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  ⚠️
                                </span>
                              )}
                              <div
                                style={{
                                  fontWeight: 600,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {courseSlot.course.courseName}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.688rem",
                                  color: "#374151",
                                  marginTop: "0.25rem",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {courseSlot.course.classroom || "—"}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
