"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { CourseForSelection } from "@/types/mockSchedule";

type CourseSearchPanelProps = {
  selectedCourseIds: string[];
  onAddCourse: (course: CourseForSelection) => void;
  initialSemester?: {
    year: string;
    term: string;
  };
};

export function CourseSearchPanel({
  selectedCourseIds,
  onAddCourse,
  initialSemester,
}: CourseSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [semester, setSemester] = useState(
    initialSemester ? `${initialSemester.year}-${initialSemester.term}` : "114-1"
  );
  const [courses, setCourses] = useState<CourseForSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 搜尋課程
  const handleSearch = async (query: string, sem: string) => {
    if (!query.trim()) {
      setCourses([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const [year, term] = sem.split("-");
      const params = new URLSearchParams({
        q: query,
        semester: sem,
      });

      const res = await fetch(`/api/courses?${params.toString()}`);
      if (!res.ok) throw new Error("搜尋失敗");

      const data = await res.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error("搜尋失敗:", error);
      alert("搜尋失敗，請稍後再試");
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // 搜尋框變更（防抖）
  const handleQueryChange = (value: string) => {
    setSearchQuery(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      handleSearch(value, semester);
    }, 500);
  };

  // 學期變更
  const handleSemesterChange = (value: string) => {
    setSemester(value);
    if (searchQuery.trim()) {
      handleSearch(searchQuery, value);
    }
  };

  // 清理 timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div>
      {/* 搜尋框與篩選 */}
      <div className="ts-box is-raised" style={{ marginBottom: "1.5rem" }}>
        <div className="ts-content" style={{ padding: "1.5rem" }}>
          <div className="ts-header is-large" style={{ marginBottom: "1rem" }}>
            搜尋課程
          </div>

          {/* 搜尋框 */}
          <div style={{ marginBottom: "1rem" }}>
            <input
              type="text"
              className="ts-input is-fluid"
              placeholder="輸入課程名稱、課號或教師姓名..."
              value={searchQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
            />
          </div>

          {/* 學期選擇器 */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 600 }}>
              學期
            </label>
            <select
              className="ts-select is-fluid"
              value={semester}
              onChange={(e) => handleSemesterChange(e.target.value)}
            >
              <option value="114-1">114 學年第 1 學期</option>
              <option value="114-2">114 學年第 2 學期</option>
              <option value="113-1">113 學年第 1 學期</option>
              <option value="113-2">113 學年第 2 學期</option>
            </select>
          </div>
        </div>
      </div>

      {/* 搜尋結果 */}
      <div className="ts-box is-raised">
        <div className="ts-content" style={{ padding: "1.5rem" }}>
          <div className="ts-header is-large" style={{ marginBottom: "1rem" }}>
            搜尋結果 {hasSearched && `(${courses.length})`}
          </div>

          {loading && (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--ts-gray-500)" }}>
              搜尋中...
            </div>
          )}

          {!loading && !hasSearched && (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--ts-gray-500)" }}>
              輸入關鍵字開始搜尋
            </div>
          )}

          {!loading && hasSearched && courses.length === 0 && (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--ts-gray-500)" }}>
              找不到符合條件的課程
            </div>
          )}

          {!loading && courses.length > 0 && (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {courses.map((course) => {
                const isAdded = selectedCourseIds.includes(course.id);
                return (
                  <div
                    key={course.id}
                    style={{
                      padding: "1rem",
                      backgroundColor: "var(--ts-gray-50)",
                      borderRadius: "8px",
                      border: isAdded
                        ? "2px solid var(--ts-positive-500)"
                        : "1px solid var(--ts-gray-200)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <Link
                          href={`/courses/${course.id}`}
                          target="_blank"
                          style={{
                            fontSize: "1rem",
                            fontWeight: 600,
                            color: "var(--ts-primary-600)",
                            textDecoration: "none",
                            display: "block",
                            marginBottom: "0.5rem",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                        >
                          {course.courseName}
                        </Link>

                        <div style={{ fontSize: "0.875rem", color: "var(--ts-gray-600)", marginBottom: "0.5rem" }}>
                          {course.instructors.map((i) => i.instructor.name).join("、") || "—"}
                          {course.time && ` | ${course.time}`}
                          {course.classroom && ` | ${course.classroom}`}
                        </div>

                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", fontSize: "0.813rem" }}>
                          {course.department && (
                            <span className="ts-badge">{course.department}</span>
                          )}
                          {course.credits && (
                            <span className="ts-badge is-outlined">{course.credits} 學分</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => !isAdded && onAddCourse(course)}
                        className={`ts-button is-small ${
                          isAdded ? "is-positive is-outlined" : "is-primary"
                        }`}
                        disabled={isAdded}
                        style={{ marginLeft: "1rem", minWidth: "80px" }}
                      >
                        {isAdded ? "已加入" : "加入課表"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
