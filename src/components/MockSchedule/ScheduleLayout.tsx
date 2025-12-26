"use client";

import { useState, useEffect } from "react";
import type { SelectedCourse, CourseForSelection, ConflictMap } from "@/types/mockSchedule";
import { loadSchedule, saveSchedule } from "@/lib/scheduleStorage";
import { detectConflicts } from "@/lib/scheduleConflict";
import { CourseSearchPanel } from "./CourseSearchPanel";
import { SchedulePanel } from "./SchedulePanel";

type ScheduleLayoutProps = {
  initialCourses?: CourseForSelection[];
  initialSemester?: {
    year: string;
    term: string;
  };
};

export function ScheduleLayout({ initialCourses = [], initialSemester }: ScheduleLayoutProps) {
  const [selectedCourses, setSelectedCourses] = useState<SelectedCourse[]>([]);
  const [conflicts, setConflicts] = useState<ConflictMap>({});
  const [loading, setLoading] = useState(true);

  // 初始化：從 localStorage 讀取 + 合併分享連結的課程
  useEffect(() => {
    const stored = loadSchedule();
    let courses: SelectedCourse[] = stored?.selectedCourses || [];

    // 若有分享連結參數，合併至已選課程（避免重複）
    if (initialCourses.length > 0) {
      const sharedCourses = initialCourses.map(convertToSelectedCourse);

      // 合併：URL 參數優先（若 localStorage 也有同 ID 課程，以 URL 為準）
      const existingIds = new Set(courses.map((c) => c.id));
      sharedCourses.forEach((sc) => {
        if (!existingIds.has(sc.id)) {
          courses.push(sc);
        }
      });
    }

    setSelectedCourses(courses);
    setLoading(false);
  }, [initialCourses]);

  // 衝堂檢測：每次課程變更時重新計算
  useEffect(() => {
    const newConflicts = detectConflicts(selectedCourses);
    setConflicts(newConflicts);
  }, [selectedCourses]);

  // 自動儲存：每次課程變更時寫入 localStorage
  useEffect(() => {
    if (!loading) {
      saveSchedule(selectedCourses);
    }
  }, [selectedCourses, loading]);

  // 加入課程
  const handleAddCourse = (course: CourseForSelection) => {
    // 檢查是否已加入
    if (selectedCourses.some((c) => c.id === course.id)) {
      alert("此課程已在課表中");
      return;
    }

    const newCourse = convertToSelectedCourse(course);
    setSelectedCourses([...selectedCourses, newCourse]);
  };

  // 移除課程
  const handleRemoveCourse = (courseId: string) => {
    setSelectedCourses(selectedCourses.filter((c) => c.id !== courseId));
  };

  // 清空所有課程
  const handleClearAll = () => {
    if (selectedCourses.length === 0) return;

    if (confirm("確定要清空所有課程嗎？此操作無法復原。")) {
      setSelectedCourses([]);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <div className="ts-header is-large">載入中...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 480px",
        gap: "2rem",
      }}
      className="mock-schedule-layout"
    >
      {/* 左側：課程搜尋面板 */}
      <CourseSearchPanel
        selectedCourseIds={selectedCourses.map((c) => c.id)}
        onAddCourse={handleAddCourse}
        initialSemester={initialSemester}
      />

      {/* 右側：已選課表面板 */}
      <SchedulePanel
        selectedCourses={selectedCourses}
        conflicts={conflicts}
        onRemoveCourse={handleRemoveCourse}
        onClearAll={handleClearAll}
      />

      {/* 響應式 CSS */}
      <style jsx>{`
        @media (max-width: 1024px) {
          .mock-schedule-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * 將完整 Course 型別轉換為 SelectedCourse（僅保留必要欄位）
 */
function convertToSelectedCourse(course: CourseForSelection): SelectedCourse {
  return {
    id: course.id,
    courseName: course.courseName,
    credits: course.credits,
    time: course.time,
    instructorNames: course.instructors.map((i) => i.instructor.name),
    department: course.department,
    year: course.year,
    term: course.term,
    classroom: course.classroom,
  };
}
