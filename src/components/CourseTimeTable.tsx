"use client";

import {
  parseCourseTime,
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

  // Always show Monday to Friday (1-5)
  const displayDays = [1, 2, 3, 4, 5];

  // Check if there are any night periods (10-13) in the course
  const hasNightPeriods = slots.some((slot) =>
    slot.periods.some((p) => typeof p === "number" && p >= 10 && p <= 13)
  );

  // Show periods M, 1-9 by default, and include 10-13 if there are night classes
  const allPeriods: PeriodKey[] = hasNightPeriods
    ? ["M", 1, 2, 3, 4, "A", 5, 6, 7, 8, 9, 10, 11, 12, 13]
    : ["M", 1, 2, 3, 4, "A", 5, 6, 7, 8, 9];

  // Helper to calculate rowspan for merged cells
  // Returns { rowspan, skip } for each day-period combination
  const getCellInfo = (day: number, periodIdx: number): { rowspan: number; skip: boolean } => {
    const period = allPeriods[periodIdx];

    // Find the slot for this day
    const daySlot = slots.find((s) => s.day === day);
    if (!daySlot || !daySlot.periods.includes(period)) {
      return { rowspan: 1, skip: false };
    }

    // Check if this is the start of a consecutive block
    const periodIndexInSlot = daySlot.periods.indexOf(period);
    if (periodIndexInSlot === -1) {
      return { rowspan: 1, skip: false };
    }

    // If not the first period in the slot, skip this cell (it's merged)
    if (periodIndexInSlot > 0) {
      const prevPeriod = daySlot.periods[periodIndexInSlot - 1];
      const prevPeriodIdx = allPeriods.indexOf(prevPeriod);
      // Check if previous period is consecutive (previous row)
      if (prevPeriodIdx === periodIdx - 1) {
        return { rowspan: 1, skip: true };
      }
    }

    // Count consecutive periods
    let rowspan = 1;
    for (let i = periodIndexInSlot + 1; i < daySlot.periods.length; i++) {
      const currentPeriod = daySlot.periods[i];
      const prevPeriod = daySlot.periods[i - 1];
      const currentIdx = allPeriods.indexOf(currentPeriod);
      const prevIdx = allPeriods.indexOf(prevPeriod);

      // Check if consecutive
      if (currentIdx === prevIdx + 1) {
        rowspan++;
      } else {
        break;
      }
    }

    return { rowspan, skip: false };
  };

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
                      periodIdx < allPeriods.length - 1
                        ? "1px solid var(--app-table-border)"
                        : "none",
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
                  const cellInfo = getCellInfo(day, periodIdx);

                  // Skip cells that are merged by rowspan
                  if (cellInfo.skip) {
                    return null;
                  }

                  const hasClass = hasClassAt(slots, day, period);

                  return (
                    <td
                      key={day}
                      rowSpan={cellInfo.rowspan}
                      style={{
                        padding: hasClass ? "0.75rem 1rem" : "0.75rem 1rem",
                        textAlign: "center",
                        verticalAlign: "stretch",
                        borderBottom:
                          periodIdx + cellInfo.rowspan - 1 < allPeriods.length - 1
                            ? "1px solid var(--app-table-border)"
                            : "none",
                        background: hasClass
                          ? "color-mix(in srgb, var(--ts-primary-500) 8%, transparent)"
                          : "transparent",
                        position: "relative",
                      }}
                    >
                      {hasClass && (
                        <div
                          style={{
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            color: "var(--ts-primary-700)",
                            padding: "0.5rem",
                            borderRadius: "6px",
                            background:
                              "color-mix(in srgb, var(--ts-primary-500) 12%, transparent)",
                            border:
                              "1px solid color-mix(in srgb, var(--ts-primary-500) 20%, transparent)",
                          }}
                        >
                          {courseName ? (
                            <div
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: "120px",
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
            {idx > 0 && "、"}週{slot.dayLabel} {slot.startTime}-{slot.endTime}
          </span>
        ))}
      </div>
    </div>
  );
}
