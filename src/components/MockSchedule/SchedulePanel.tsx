"use client";

import { useRef } from "react";
import type { SelectedCourse, ConflictMap } from "@/types/mockSchedule";
import { ScheduleStats } from "./ScheduleStats";
import { MultiCourseTimeTable } from "./MultiCourseTimeTable";
import { SelectedCourseList } from "./SelectedCourseList";

type SchedulePanelProps = {
  selectedCourses: SelectedCourse[];
  conflicts: ConflictMap;
  onRemoveCourse: (courseId: string) => void;
  onClearAll: () => void;
};

export function SchedulePanel({
  selectedCourses,
  conflicts,
  onRemoveCourse,
  onClearAll,
}: SchedulePanelProps) {
  const scheduleRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ position: "sticky", top: "80px" }}>
      {/* 學分統計與操作按鈕 */}
      <ScheduleStats
        selectedCourses={selectedCourses}
        conflicts={conflicts}
        onClearAll={onClearAll}
        scheduleRef={scheduleRef}
      />

      {/* 課表網格 */}
      <div
        ref={scheduleRef}
        id="schedule-export-area"
        className="ts-box is-raised"
        style={{ marginTop: "1.5rem" }}
      >
        <div className="ts-content" style={{ padding: "1.5rem" }}>
          <div className="ts-header is-large" style={{ marginBottom: "1rem" }}>
            課表
          </div>

          {selectedCourses.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--ts-gray-500)" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📅</div>
              <div>尚未加入任何課程</div>
              <div style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
                從左側搜尋並加入課程開始規劃
              </div>
            </div>
          ) : (
            <MultiCourseTimeTable selectedCourses={selectedCourses} conflicts={conflicts} />
          )}
        </div>
      </div>

      {/* 已選課程清單 */}
      {selectedCourses.length > 0 && (
        <div className="ts-box is-raised" style={{ marginTop: "1.5rem" }}>
          <div className="ts-content" style={{ padding: "1.5rem" }}>
            <div className="ts-header is-large" style={{ marginBottom: "1rem" }}>
              已選課程 ({selectedCourses.length})
            </div>

            <SelectedCourseList
              selectedCourses={selectedCourses}
              conflicts={conflicts}
              onRemoveCourse={onRemoveCourse}
            />
          </div>
        </div>
      )}
    </div>
  );
}
