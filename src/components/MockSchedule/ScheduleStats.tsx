"use client";

import type { RefObject } from "react";
import type { SelectedCourse, ConflictMap } from "@/types/mockSchedule";
import { getTotalCredits } from "@/lib/scheduleStorage";
import { getConflictCount } from "@/lib/scheduleConflict";
import { ExportButton } from "./ExportButton";
import { ShareButton } from "./ShareButton";

type ScheduleStatsProps = {
  selectedCourses: SelectedCourse[];
  conflicts: ConflictMap;
  onClearAll: () => void;
  scheduleRef: RefObject<HTMLDivElement | null>;
};

export function ScheduleStats({
  selectedCourses,
  conflicts,
  onClearAll,
  scheduleRef,
}: ScheduleStatsProps) {
  const totalCredits = getTotalCredits(selectedCourses);
  const conflictCount = getConflictCount(conflicts);

  return (
    <div className="ts-box is-secondary" style={{ padding: "1.5rem" }}>
      {/* 統計數字 */}
      <div
        className="ts-grid is-3-columns"
        style={{ gap: "1rem", marginBottom: "1.5rem" }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            className="app-muted"
            style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}
          >
            總學分
          </div>
          <div
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              color: "var(--ts-primary-600)",
            }}
          >
            {totalCredits}
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            className="app-muted"
            style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}
          >
            課程數
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>
            {selectedCourses.length}
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            className="app-muted"
            style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}
          >
            衝堂
          </div>
          <div
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              color:
                conflictCount > 0
                  ? "var(--ts-negative-600)"
                  : "var(--ts-gray-500)",
            }}
          >
            {conflictCount > 0 ? `${conflictCount} ⚠️` : "無"}
          </div>
        </div>
      </div>

      {/* 操作按鈕 */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <ExportButton scheduleRef={scheduleRef} />
        <ShareButton selectedCourses={selectedCourses} />
        <button
          className="ts-button is-ghost is-negative"
          onClick={onClearAll}
          disabled={selectedCourses.length === 0}
        >
          清空課表
        </button>
      </div>
    </div>
  );
}
