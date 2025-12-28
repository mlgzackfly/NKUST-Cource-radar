"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// 動態載入 ECharts 避免 SSR 問題
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface InstructorStatsData {
  semesterTrends: {
    semester: string;
    count: number;
    avgCoolness: number;
    avgUsefulness: number;
    avgWorkload: number;
    avgAttendance: number;
    avgGrading: number;
  }[];
  ratingDistribution: {
    coolness: number[];
    usefulness: number[];
    workload: number[];
    attendance: number[];
    grading: number[];
  };
  topCourses: {
    id: string;
    name: string;
    code: string | null;
    semester: string;
    reviewCount: number;
    avgRating: {
      coolness: number;
      usefulness: number;
      workload: number;
      attendance: number;
      grading: number;
    };
  }[];
  comparison: {
    instructor: {
      coolness: number;
      usefulness: number;
      workload: number;
      attendance: number;
      grading: number;
    };
    schoolAverage: {
      coolness: number;
      usefulness: number;
      workload: number;
      attendance: number;
      grading: number;
    };
  };
}

interface InstructorStatsChartProps {
  instructorId: string;
}

export function InstructorStatsChart({ instructorId }: InstructorStatsChartProps) {
  const [data, setData] = useState<InstructorStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"trend" | "distribution" | "comparison">("trend");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/instructors/${instructorId}/stats`);
        if (!response.ok) {
          throw new Error("Failed to fetch stats");
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
  }, [instructorId]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <div className="ts-loading" />
        <p style={{ marginTop: "0.5rem", color: "var(--ts-gray-600)", fontSize: "0.875rem" }}>
          載入統計資料...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "1rem", textAlign: "center", color: "var(--ts-gray-600)" }}>
        無法載入統計資料
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
      data: ["涼度", "實用性", "負擔", "出席", "給分"],
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
        name: "負擔",
        type: "line",
        data: data.semesterTrends.map((t) => t.avgWorkload.toFixed(2)),
        smooth: true,
        itemStyle: { color: "#f59e0b" },
      },
      {
        name: "出席",
        type: "line",
        data: data.semesterTrends.map((t) => t.avgAttendance.toFixed(2)),
        smooth: true,
        itemStyle: { color: "#8b5cf6" },
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

  // 分佈圖表配置
  const distributionOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
    },
    legend: {
      data: ["涼度", "實用性", "負擔", "出席", "給分"],
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
      data: ["1星", "2星", "3星", "4星", "5星"],
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: "value",
      axisLabel: { fontSize: 10 },
    },
    series: [
      {
        name: "涼度",
        type: "bar",
        data: data.ratingDistribution.coolness,
        itemStyle: { color: "#3b82f6" },
      },
      {
        name: "實用性",
        type: "bar",
        data: data.ratingDistribution.usefulness,
        itemStyle: { color: "#10b981" },
      },
      {
        name: "負擔",
        type: "bar",
        data: data.ratingDistribution.workload,
        itemStyle: { color: "#f59e0b" },
      },
      {
        name: "出席",
        type: "bar",
        data: data.ratingDistribution.attendance,
        itemStyle: { color: "#8b5cf6" },
      },
      {
        name: "給分",
        type: "bar",
        data: data.ratingDistribution.grading,
        itemStyle: { color: "#ef4444" },
      },
    ],
  };

  // 與全校比較的雷達圖配置
  const comparisonOption = {
    tooltip: { trigger: "item" },
    legend: {
      data: ["該教師", "全校平均"],
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    radar: {
      indicator: [
        { name: "涼度", max: 5 },
        { name: "實用性", max: 5 },
        { name: "負擔", max: 5 },
        { name: "出席", max: 5 },
        { name: "給分", max: 5 },
      ],
      shape: "polygon",
      splitNumber: 5,
      axisName: {
        color: "var(--ts-gray-700)",
        fontSize: 11,
      },
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: [
              data.comparison.instructor.coolness,
              data.comparison.instructor.usefulness,
              data.comparison.instructor.workload,
              data.comparison.instructor.attendance,
              data.comparison.instructor.grading,
            ],
            name: "該教師",
            lineStyle: { color: "#3b82f6", width: 2 },
            areaStyle: { color: "#3b82f6", opacity: 0.3 },
            itemStyle: { color: "#3b82f6" },
          },
          {
            value: [
              data.comparison.schoolAverage.coolness,
              data.comparison.schoolAverage.usefulness,
              data.comparison.schoolAverage.workload,
              data.comparison.schoolAverage.attendance,
              data.comparison.schoolAverage.grading,
            ],
            name: "全校平均",
            lineStyle: { color: "#94a3b8", width: 2 },
            areaStyle: { color: "#94a3b8", opacity: 0.2 },
            itemStyle: { color: "#94a3b8" },
          },
        ],
      },
    ],
  };

  return (
    <div>
      {/* Tab 選擇器 */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          type="button"
          className={`ts-button is-small ${activeTab === "trend" ? "is-primary" : "is-outlined"}`}
          onClick={() => setActiveTab("trend")}
        >
          趨勢分析
        </button>
        <button
          type="button"
          className={`ts-button is-small ${activeTab === "distribution" ? "is-primary" : "is-outlined"}`}
          onClick={() => setActiveTab("distribution")}
        >
          評分分佈
        </button>
        <button
          type="button"
          className={`ts-button is-small ${activeTab === "comparison" ? "is-primary" : "is-outlined"}`}
          onClick={() => setActiveTab("comparison")}
        >
          與全校比較
        </button>
      </div>

      {/* 圖表內容 */}
      <div style={{ height: "300px" }}>
        {activeTab === "trend" && data.semesterTrends.length > 0 && (
          <ReactECharts option={trendOption} style={{ height: "100%", width: "100%" }} />
        )}
        {activeTab === "trend" && data.semesterTrends.length === 0 && (
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
        {activeTab === "distribution" && (
          <ReactECharts option={distributionOption} style={{ height: "100%", width: "100%" }} />
        )}
        {activeTab === "comparison" && (
          <ReactECharts option={comparisonOption} style={{ height: "100%", width: "100%" }} />
        )}
      </div>

      {/* 熱門課程 */}
      {data.topCourses.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <h4 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            熱門課程
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {data.topCourses.slice(0, 5).map((course, index) => (
              <div
                key={course.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.5rem",
                  background: "var(--ts-gray-50)",
                  borderRadius: "6px",
                }}
              >
                <span
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "var(--ts-primary-100)",
                    color: "var(--ts-primary-600)",
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
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {course.name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--ts-gray-500)" }}>
                    {course.semester} · {course.reviewCount} 則評論
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--ts-primary-500)",
                  }}
                >
                  {((course.avgRating.coolness + course.avgRating.grading) / 2).toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
