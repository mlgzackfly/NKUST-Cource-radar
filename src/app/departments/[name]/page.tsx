"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

// 動態載入 ECharts 避免 SSR 問題
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface DepartmentStats {
  overview: {
    department: string;
    totalCourses: number;
    totalInstructors: number;
    totalReviews: number;
  };
  semesterTrends: {
    semester: string;
    courseCount: number;
    reviewCount: number;
    avgCoolness: number;
    avgUsefulness: number;
    avgWorkload: number;
    avgAttendance: number;
    avgGrading: number;
  }[];
  topInstructors: {
    id: string;
    name: string;
    reviewCount: number;
    avgRating: {
      coolness: number;
      usefulness: number;
      workload: number;
      attendance: number;
      grading: number;
    };
  }[];
  topCourses: {
    id: string;
    name: string;
    code: string | null;
    semester: string;
    instructors: string[];
    reviewCount: number;
    avgRating: {
      coolness: number;
      usefulness: number;
      workload: number;
      attendance: number;
      grading: number;
    };
  }[];
  ratingDistribution: {
    coolness: number[];
    usefulness: number[];
    workload: number[];
    attendance: number[];
    grading: number[];
  };
}

// 計算綜合評分
const getOverallRating = (rating: { coolness: number; usefulness: number; grading: number }) => {
  const values = [rating.coolness, rating.usefulness, rating.grading].filter((v) => v > 0);
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
};

// 評分顏色
const getRatingColor = (rating: number) => {
  if (rating >= 4) return "var(--ts-positive-500)";
  if (rating >= 3) return "var(--ts-warning-500)";
  if (rating >= 2) return "var(--ts-gray-500)";
  return "var(--ts-negative-500)";
};

export default function DepartmentPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const decodedName = decodeURIComponent(name);

  const [data, setData] = useState<DepartmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/departments/${encodeURIComponent(decodedName)}/stats`);
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || "Failed to fetch");
        }
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [decodedName]);

  if (loading) {
    return (
      <div className="app-container" style={{ padding: "2rem", textAlign: "center" }}>
        <div className="ts-loading is-large" />
        <p style={{ marginTop: "1rem", color: "var(--ts-gray-600)" }}>載入系所資料...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="app-container" style={{ padding: "2rem" }}>
        <div className="ts-box is-raised" style={{ padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>😢</div>
          <h2 style={{ marginBottom: "0.5rem" }}>找不到系所</h2>
          <p style={{ color: "var(--ts-gray-600)", marginBottom: "1.5rem" }}>
            {error || "該系所不存在或沒有課程資料"}
          </p>
          <Link href="/courses" className="ts-button is-primary">
            返回課程列表
          </Link>
        </div>
      </div>
    );
  }

  // 趨勢圖表配置
  const trendOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
    },
    legend: {
      data: ["涼度", "實用性", "給分"],
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "15%",
      top: "10%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: data.semesterTrends.map((t) => t.semester),
      axisLabel: { fontSize: 10, rotate: 45 },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 5,
      axisLabel: { fontSize: 10 },
    },
    series: [
      {
        name: "涼度",
        type: "line",
        data: data.semesterTrends.map((t) => t.avgCoolness.toFixed(2)),
        smooth: true,
        itemStyle: { color: "#3b82f6" },
      },
      {
        name: "實用性",
        type: "line",
        data: data.semesterTrends.map((t) => t.avgUsefulness.toFixed(2)),
        smooth: true,
        itemStyle: { color: "#10b981" },
      },
      {
        name: "給分",
        type: "line",
        data: data.semesterTrends.map((t) => t.avgGrading.toFixed(2)),
        smooth: true,
        itemStyle: { color: "#ef4444" },
      },
    ],
  };

  // 課程數量與評論數量趨勢
  const countTrendOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
    },
    legend: {
      data: ["課程數", "評論數"],
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "15%",
      top: "10%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: data.semesterTrends.map((t) => t.semester),
      axisLabel: { fontSize: 10, rotate: 45 },
    },
    yAxis: {
      type: "value",
      axisLabel: { fontSize: 10 },
    },
    series: [
      {
        name: "課程數",
        type: "bar",
        data: data.semesterTrends.map((t) => t.courseCount),
        itemStyle: { color: "#3b82f6" },
      },
      {
        name: "評論數",
        type: "bar",
        data: data.semesterTrends.map((t) => t.reviewCount),
        itemStyle: { color: "#10b981" },
      },
    ],
  };

  return (
    <div className="app-container" style={{ padding: "2rem 1rem", paddingBottom: "4rem" }}>
      {/* 標題區 */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}
        >
          <Link href="/courses" className="ts-button is-ghost is-icon" title="返回">
            <span className="ts-icon is-arrow-left-icon" />
          </Link>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>{data.overview.department}</h1>
        </div>
        <p style={{ color: "var(--ts-gray-600)" }}>系所統計與分析</p>
      </div>

      {/* 概覽統計卡片 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div className="ts-box is-raised" style={{ padding: "1rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--ts-primary-500)" }}>
            {data.overview.totalCourses}
          </div>
          <div style={{ fontSize: "0.875rem", color: "var(--ts-gray-600)" }}>開設課程</div>
        </div>
        <div className="ts-box is-raised" style={{ padding: "1rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--ts-positive-500)" }}>
            {data.overview.totalInstructors}
          </div>
          <div style={{ fontSize: "0.875rem", color: "var(--ts-gray-600)" }}>授課教師</div>
        </div>
        <div className="ts-box is-raised" style={{ padding: "1rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--ts-warning-500)" }}>
            {data.overview.totalReviews}
          </div>
          <div style={{ fontSize: "0.875rem", color: "var(--ts-gray-600)" }}>課程評論</div>
        </div>
      </div>

      {/* 趨勢圖表 */}
      <div className="ts-box is-raised" style={{ marginBottom: "1.5rem" }}>
        <div className="ts-content">
          <h3 style={{ marginBottom: "1rem", fontWeight: 600 }}>評分趨勢</h3>
          <div style={{ height: "280px" }}>
            {data.semesterTrends.length > 0 ? (
              <ReactECharts option={trendOption} style={{ height: "100%", width: "100%" }} />
            ) : (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--ts-gray-500)",
                }}
              >
                暫無趨勢資料
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 課程數量趨勢 */}
      <div className="ts-box is-raised" style={{ marginBottom: "1.5rem" }}>
        <div className="ts-content">
          <h3 style={{ marginBottom: "1rem", fontWeight: 600 }}>課程與評論數量</h3>
          <div style={{ height: "280px" }}>
            {data.semesterTrends.length > 0 ? (
              <ReactECharts option={countTrendOption} style={{ height: "100%", width: "100%" }} />
            ) : (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--ts-gray-500)",
                }}
              >
                暫無資料
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 熱門教師 */}
      <div className="ts-box is-raised" style={{ marginBottom: "1.5rem" }}>
        <div className="ts-content">
          <h3 style={{ marginBottom: "1rem", fontWeight: 600 }}>熱門教師</h3>
          {data.topInstructors.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {data.topInstructors.map((instructor, index) => {
                const overallRating = getOverallRating(instructor.avgRating);
                return (
                  <Link
                    key={instructor.id}
                    href={`/instructors/${instructor.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.75rem",
                      background: "var(--ts-gray-50)",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "inherit",
                      transition: "background 0.15s",
                    }}
                  >
                    <span
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: index < 3 ? "var(--ts-warning-100)" : "var(--ts-gray-100)",
                        color: index < 3 ? "var(--ts-warning-700)" : "var(--ts-gray-600)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {index + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{instructor.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--ts-gray-500)" }}>
                        {instructor.reviewCount} 則評論
                      </div>
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: getRatingColor(overallRating),
                      }}
                    >
                      {overallRating > 0 ? overallRating.toFixed(1) : "-"}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p style={{ color: "var(--ts-gray-500)", textAlign: "center" }}>暫無資料</p>
          )}
        </div>
      </div>

      {/* 熱門課程 */}
      <div className="ts-box is-raised">
        <div className="ts-content">
          <h3 style={{ marginBottom: "1rem", fontWeight: 600 }}>熱門課程</h3>
          {data.topCourses.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {data.topCourses.map((course, index) => {
                const overallRating = getOverallRating(course.avgRating);
                return (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.75rem",
                      background: "var(--ts-gray-50)",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "inherit",
                      transition: "background 0.15s",
                    }}
                  >
                    <span
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: index < 3 ? "var(--ts-primary-100)" : "var(--ts-gray-100)",
                        color: index < 3 ? "var(--ts-primary-700)" : "var(--ts-gray-600)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {index + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {course.name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--ts-gray-500)" }}>
                        {course.instructors.join("、")} · {course.semester}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: getRatingColor(overallRating),
                        }}
                      >
                        {overallRating > 0 ? overallRating.toFixed(1) : "-"}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--ts-gray-500)" }}>
                        {course.reviewCount} 則
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p style={{ color: "var(--ts-gray-500)", textAlign: "center" }}>暫無資料</p>
          )}
        </div>
      </div>

      {/* 查看該系所課程連結 */}
      <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
        <Link
          href={`/courses?department=${encodeURIComponent(data.overview.department)}`}
          className="ts-button is-primary"
        >
          查看該系所所有課程
        </Link>
      </div>
    </div>
  );
}
