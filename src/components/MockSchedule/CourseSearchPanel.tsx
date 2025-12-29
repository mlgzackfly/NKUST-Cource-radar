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

type SemesterOption = {
  value: string;
  label: string;
};

export function CourseSearchPanel({
  selectedCourseIds,
  onAddCourse,
  initialSemester,
}: CourseSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [semester, setSemester] = useState(
    initialSemester ? `${initialSemester.year}-${initialSemester.term}` : ""
  );
  const [courses, setCourses] = useState<CourseForSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [semestersLoading, setSemestersLoading] = useState(false);

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

  // 載入學期選項
  useEffect(() => {
    setSemestersLoading(true);
    fetch("/api/courses/filters", { cache: "force-cache" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      })
      .then((data) => {
        // 組合 year 和 term 成為學期選項
        const years = data.years || [];
        const terms = data.terms || [];

        const semesterSet = new Set<string>();
        years.forEach((year: string) => {
          terms.forEach((term: string) => {
            semesterSet.add(`${year}-${term}`);
          });
        });

        const semesterOptions = Array.from(semesterSet)
          .sort((a, b) => b.localeCompare(a)) // 按新到舊排序
          .map((sem) => {
            const [year, term] = sem.split("-");
            return {
              value: sem,
              label: `${year} 學年第 ${term} 學期`,
            };
          });

        setSemesters(semesterOptions);

        // 如果沒有 initialSemester，預設選擇最新的學期
        if (!initialSemester && semesterOptions.length > 0) {
          setSemester(semesterOptions[0].value);
        }
      })
      .catch((error) => {
        console.error("載入學期選項失敗:", error);
        setSemesters([]);
      })
      .finally(() => {
        setSemestersLoading(false);
      });
  }, [initialSemester]);

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
            <div className="ts-input is-solid is-fluid">
              <input
                type="text"
                placeholder="輸入課程名稱、課號或教師姓名..."
                value={searchQuery}
                onChange={(e) => handleQueryChange(e.target.value)}
              />
            </div>
          </div>

          {/* 學期選擇器 */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontSize: "0.875rem",
                fontWeight: 600,
              }}
            >
              學期
            </label>
            <div className="ts-select is-solid is-fluid">
              <select
                value={semester}
                onChange={(e) => handleSemesterChange(e.target.value)}
                disabled={semestersLoading || semesters.length === 0}
              >
                {semestersLoading && <option value="">載入中...</option>}
                {!semestersLoading && semesters.length === 0 && (
                  <option value="">無可用學期</option>
                )}
                {!semestersLoading &&
                  semesters.map((sem) => (
                    <option key={sem.value} value={sem.value}>
                      {sem.label}
                    </option>
                  ))}
              </select>
            </div>
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
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
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

                        <div
                          style={{
                            fontSize: "0.875rem",
                            color: "var(--ts-gray-600)",
                            marginBottom: "0.5rem",
                          }}
                        >
                          {course.instructors.map((i) => i.name).join("、") || "—"}
                          {course.time && ` | ${course.time}`}
                          {course.classroom && ` | ${course.classroom}`}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            flexWrap: "wrap",
                            fontSize: "0.813rem",
                          }}
                        >
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
