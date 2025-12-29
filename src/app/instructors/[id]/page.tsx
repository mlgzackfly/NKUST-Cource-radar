"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type Course = {
  id: string;
  courseName: string;
  courseCode: string;
  selectCode: string;
  year: string;
  term: string;
  campus: string;
  department: string;
  enrolled: number | null;
  capacity: number | null;
  credits: number | null;
  requiredOrElective: string | null;
  classroom: string | null;
  time: string | null;
  _count: { reviews: number };
};

type InstructorData = {
  instructor: {
    id: string;
    name: string;
    createdAt: string;
  };
  courses: Course[];
  stats: {
    totalCourses: number;
    totalEnrolled: number;
    totalReviews: number;
    semesters: string[];
    campuses: string[];
    departments: string[];
  };
  reviewStats: {
    averageRatings: {
      coolness: number;
      usefulness: number;
      workload: number;
      attendance: number;
      grading: number;
    };
    totalReviews: number;
  };
};

export default function InstructorPage() {
  const params = useParams();
  const router = useRouter();
  const instructorId = (params?.id as string) || "";

  const [data, setData] = useState<InstructorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>("all");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/instructors/${instructorId}`);

        if (!res.ok) {
          if (res.status === 404) {
            setError("找不到此教師");
          } else {
            setError("載入失敗");
          }
          return;
        }

        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error("Failed to fetch instructor data:", err);
        setError("載入失敗");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [instructorId]);

  if (loading) {
    return (
      <div className="ts-container" style={{ padding: "2rem", textAlign: "center" }}>
        <div className="ts-header is-large">載入中...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="ts-container" style={{ padding: "2rem" }}>
        <div className="ts-box">
          <div className="ts-content" style={{ textAlign: "center", padding: "3rem" }}>
            <div className="ts-header is-large" style={{ marginBottom: "1rem" }}>
              {error || "找不到教師資料"}
            </div>
            <button onClick={() => router.back()} className="ts-button is-outlined">
              返回
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredCourses =
    selectedSemester === "all"
      ? data.courses
      : data.courses.filter((c) => `${c.year}-${c.term}` === selectedSemester);

  // 雷達圖配置
  const radarOption = {
    title: {
      text: "平均評價",
      left: "center",
      textStyle: { fontSize: 16, fontWeight: 600 },
    },
    tooltip: {
      trigger: "item",
    },
    radar: {
      indicator: [
        { name: "有趣程度", max: 5 },
        { name: "實用性", max: 5 },
        { name: "課業負擔", max: 5 },
        { name: "出席要求", max: 5 },
        { name: "給分甜度", max: 5 },
      ],
      radius: "60%",
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: [
              data.reviewStats.averageRatings.coolness,
              data.reviewStats.averageRatings.usefulness,
              data.reviewStats.averageRatings.workload,
              data.reviewStats.averageRatings.attendance,
              data.reviewStats.averageRatings.grading,
            ],
            name: "平均評分",
            areaStyle: {
              color: "rgba(126, 87, 194, 0.2)",
            },
            lineStyle: {
              color: "#7E57C2",
            },
            itemStyle: {
              color: "#7E57C2",
            },
          },
        ],
      },
    ],
  };

  return (
    <div
      className="ts-container"
      style={{ padding: "2rem 1rem", maxWidth: "1200px", margin: "0 auto" }}
    >
      {/* 返回按鈕 */}
      <div style={{ marginBottom: "1.5rem" }}>
        <button onClick={() => router.back()} className="ts-button is-outlined">
          ← 返回
        </button>
      </div>

      {/* 教師基本資訊 */}
      <div className="ts-box" style={{ marginBottom: "2rem" }}>
        <div className="ts-content" style={{ padding: "2rem" }}>
          <div className="ts-header is-huge" style={{ marginBottom: "0.5rem" }}>
            {data.instructor.name}
          </div>
          <div style={{ color: "var(--app-muted)", fontSize: "0.938rem" }}>教師檔案</div>
        </div>
      </div>

      {/* 統計資訊卡片 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <StatCard label="開課總數" value={data.stats.totalCourses} unit="門課" />
        <StatCard label="總上課人數" value={data.stats.totalEnrolled} unit="人" />
        <StatCard label="評價總數" value={data.reviewStats.totalReviews} unit="則" />
        <StatCard label="授課學期" value={data.stats.semesters.length} unit="學期" />
      </div>

      {/* 評價雷達圖 */}
      {data.reviewStats.totalReviews > 0 && (
        <div className="ts-box" style={{ marginBottom: "2rem" }}>
          <div className="ts-content">
            <ReactECharts option={radarOption} style={{ height: "400px" }} />
            <div
              style={{
                textAlign: "center",
                fontSize: "0.875rem",
                color: "var(--app-muted)",
                marginTop: "1rem",
              }}
            >
              基於 {data.reviewStats.totalReviews} 則評價的平均分數
            </div>
          </div>
        </div>
      )}

      {/* 授課資訊 */}
      <div className="ts-box" style={{ marginBottom: "2rem" }}>
        <div className="ts-content" style={{ padding: "1.5rem" }}>
          <div className="ts-header is-large" style={{ marginBottom: "1rem" }}>
            授課資訊
          </div>
          <div style={{ display: "grid", gap: "1rem" }}>
            <InfoItem label="授課學期" value={data.stats.semesters.join("、")} />
            <InfoItem label="授課校區" value={data.stats.campuses.join("、") || "未指定"} />
            <InfoItem label="授課系所" value={data.stats.departments.join("、") || "未指定"} />
          </div>
        </div>
      </div>

      {/* 課程列表 */}
      <div className="ts-box">
        <div className="ts-content" style={{ padding: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
            }}
          >
            <div className="ts-header is-large">開設課程 ({filteredCourses.length})</div>

            {/* 學期篩選 */}
            <div className="ts-control">
              <div className="content">
                <div className="ts-select is-solid" style={{ minWidth: "150px" }}>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                  >
                    <option value="all">全部學期</option>
                    {data.stats.semesters.map((sem) => (
                      <option key={sem} value={sem}>
                        {sem.replace("-", " 學年第 ")} 學期
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {filteredCourses.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--app-muted)" }}>
              此學期無開課
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {filteredCourses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  style={{
                    display: "block",
                    padding: "1.25rem",
                    backgroundColor: "var(--ts-gray-50)",
                    borderRadius: "8px",
                    border: "1px solid var(--ts-gray-200)",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--ts-primary-500)";
                    e.currentTarget.style.backgroundColor = "var(--ts-gray-100)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--ts-gray-200)";
                    e.currentTarget.style.backgroundColor = "var(--ts-gray-50)";
                  }}
                >
                  <div
                    className="instructor-course-header"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div>
                      <div
                        style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.25rem" }}
                      >
                        {course.courseName}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "var(--app-muted)" }}>
                        {course.courseCode} | {course.year} 學年第 {course.term} 學期
                      </div>
                    </div>
                    <div className="instructor-course-stats" style={{ textAlign: "right" }}>
                      {course.enrolled !== null && (
                        <div style={{ fontSize: "0.875rem", color: "var(--app-muted)" }}>
                          選課人數：{course.enrolled}
                          {course.capacity && ` / ${course.capacity}`}
                        </div>
                      )}
                      {course._count.reviews > 0 && (
                        <div
                          style={{
                            fontSize: "0.875rem",
                            color: "var(--ts-primary-500)",
                            marginTop: "0.25rem",
                          }}
                        >
                          {course._count.reviews} 則評價
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                      fontSize: "0.813rem",
                    }}
                  >
                    {course.department && <span className="ts-badge">{course.department}</span>}
                    {course.campus && <span className="ts-badge is-outlined">{course.campus}</span>}
                    {course.requiredOrElective && (
                      <span
                        className={`ts-badge ${course.requiredOrElective === "必修" ? "is-primary" : ""}`}
                      >
                        {course.requiredOrElective}
                      </span>
                    )}
                    {course.credits && (
                      <span className="ts-badge is-outlined">{course.credits} 學分</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="ts-box" style={{ textAlign: "center", padding: "1.5rem" }}>
      <div style={{ fontSize: "0.875rem", color: "var(--app-muted)", marginBottom: "0.5rem" }}>
        {label}
      </div>
      <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--ts-primary-500)" }}>
        {value.toLocaleString()}
      </div>
      <div style={{ fontSize: "0.813rem", color: "var(--app-muted)", marginTop: "0.25rem" }}>
        {unit}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "1rem" }}>
      <div
        style={{
          minWidth: "100px",
          fontWeight: 600,
          color: "var(--app-muted)",
        }}
      >
        {label}
      </div>
      <div>{value || "—"}</div>
    </div>
  );
}
