"use client";

import {
  parseCourseTime,
  getActiveDays,
  getAllPeriods,
  hasClassAt,
  DAY_LABELS,
  TIME_PERIODS,
  type PeriodKey,
} from "@/lib/courseTimeParser";

type CourseTimeTableProps = {
  timeString: string | null;
  courseName?: string;
};

export function CourseTimeTable({ timeString, courseName }: CourseTimeTableProps) {
  if (!timeString) {
    return (
      <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--ts-gray-500)" }}>
        無上課時間資訊
      </div>
    );
  }

  const slots = parseCourseTime(timeString);
  if (slots.length === 0) {
    return (
      <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--ts-gray-500)" }}>
        無法解析時間：{timeString}
      </div>
    );
  }

  const activeDays = getActiveDays(slots);
  const allPeriods = getAllPeriods(slots);

  // Filter out weekends if they don't have classes
  const displayDays = activeDays.filter((day) => day !== 0 && day !== 6 ? true : activeDays.includes(day));

  return (
    <div style={{ overflow: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          fontSize: "0.875rem",
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                padding: "0.75rem 0.5rem",
                textAlign: "center",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--ts-gray-600)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                borderBottom: "2px solid var(--app-table-border)",
                background: "var(--app-surface)",
                position: "sticky",
                left: 0,
                zIndex: 2,
                minWidth: "80px",
              }}
            >
              節次
            </th>
            {displayDays.map((day) => (
              <th
                key={day}
                style={{
                  padding: "0.75rem 1rem",
                  textAlign: "center",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--ts-gray-600)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  borderBottom: "2px solid var(--app-table-border)",
                  minWidth: "100px",
                }}
              >
                週{DAY_LABELS[day]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allPeriods.map((period, periodIdx) => {
            const timeInfo = TIME_PERIODS[period];
            return (
              <tr key={period}>
                <td
                  style={{
                    padding: "0.75rem 0.5rem",
                    textAlign: "center",
                    fontSize: "0.75rem",
                    color: "var(--ts-gray-600)",
                    borderBottom:
                      periodIdx < allPeriods.length - 1 ? "1px solid var(--app-table-border)" : "none",
                    background: "var(--app-surface)",
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{period}</div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--ts-gray-500)" }}>
                    {timeInfo.start}
                    <br />
                    {timeInfo.end}
                  </div>
                </td>
                {displayDays.map((day) => {
                  const hasClass = hasClassAt(slots, day, period);
                  return (
                    <td
                      key={day}
                      style={{
                        padding: "0.75rem 1rem",
                        textAlign: "center",
                        borderBottom:
                          periodIdx < allPeriods.length - 1 ? "1px solid var(--app-table-border)" : "none",
                        background: hasClass
                          ? "color-mix(in srgb, var(--ts-primary-500) 8%, transparent)"
                          : "transparent",
                        position: "relative",
                      }}
                    >
                      {hasClass && (
                        <div
                          style={{
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            color: "var(--ts-primary-700)",
                            padding: "0.5rem",
                            borderRadius: "6px",
                            background: "color-mix(in srgb, var(--ts-primary-500) 12%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--ts-primary-500) 20%, transparent)",
                          }}
                        >
                          {courseName ? (
                            <div
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: "120px",
                                margin: "0 auto",
                              }}
                            >
                              {courseName}
                            </div>
                          ) : (
                            "●"
                          )}
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

      {/* Time slots summary */}
      <div
        style={{
          marginTop: "1rem",
          padding: "0.75rem 1rem",
          background: "var(--app-surface)",
          borderRadius: "8px",
          fontSize: "0.875rem",
          color: "var(--ts-gray-700)",
        }}
      >
        <strong>上課時間：</strong>
        {slots.map((slot, idx) => (
          <span key={idx}>
            {idx > 0 && "、"}
            週{slot.dayLabel} {slot.startTime}-{slot.endTime}
          </span>
        ))}
      </div>
    </div>
  );
}
