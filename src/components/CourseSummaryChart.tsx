"use client";

import { useEffect, useState } from "react";
import type { EChartsOption } from "echarts";

type SummaryData = {
  totalReviews: number;
  avg: {
    coolness: number | null;
    usefulness: number | null;
    workload: number | null;
    attendance: number | null;
    grading: number | null;
  };
};

type CourseSummaryChartProps = {
  summary: SummaryData;
};

// 客戶端雷達圖組件（延遲載入）
function RadarChartComponent({ data }: { data: Array<{ name: string; value: number }> }) {
  const [ReactECharts, setReactECharts] = useState<any>(null);

  useEffect(() => {
    // 動態導入 ECharts（只在客戶端）
    import("echarts-for-react").then((mod) => {
      setReactECharts(() => mod.default);
    });
  }, []);

  if (!ReactECharts) {
    return (
      <div
        style={{
          height: 350,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--app-muted)",
        }}
      >
        載入圖表中...
      </div>
    );
  }

  const option: EChartsOption = {
    radar: {
      indicator: data.map((item) => ({
        name: item.name,
        max: 5,
      })),
      center: ["50%", "45%"],
      radius: "65%",
      splitNumber: 5,
      axisName: {
        color: "#374151",
        fontSize: 13,
        fontWeight: 500,
      },
      splitLine: {
        lineStyle: {
          color: "#d1d5db",
          type: "dashed",
        },
      },
      splitArea: {
        show: false,
      },
      axisLine: {
        lineStyle: {
          color: "#d1d5db",
        },
      },
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: data.map((item) => item.value),
            name: "平均評分",
            areaStyle: {
              color: "rgba(59, 130, 246, 0.25)",
            },
            lineStyle: {
              color: "#3b82f6",
              width: 2.5,
            },
            itemStyle: {
              color: "#3b82f6",
            },
          },
        ],
      },
    ],
    legend: {
      bottom: 10,
      data: ["平均評分"],
      textStyle: {
        fontSize: 14,
      },
    },
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: "350px", width: "100%" }}
      opts={{ renderer: "svg" }}
    />
  );
}

const CourseSummaryChart = ({ summary }: CourseSummaryChartProps) => {
  // 如果沒有評論，顯示提示訊息
  if (summary.totalReviews === 0) {
    return (
      <div
        style={{
          height: 300,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--app-muted)",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.5 }}>📊</div>
        <div style={{ fontSize: "0.9375rem" }}>尚無評分資料</div>
        <div style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>成為第一位評論者</div>
      </div>
    );
  }

  const data = [
    { name: "涼度", value: summary.avg.coolness ?? 0 },
    { name: "實用", value: summary.avg.usefulness ?? 0 },
    { name: "作業量", value: summary.avg.workload ?? 0 },
    { name: "出席", value: summary.avg.attendance ?? 0 },
    { name: "甜度", value: summary.avg.grading ?? 0 },
  ];

  return (
    <div style={{ width: "100%", padding: "1.5rem 0" }}>
      {/* 雷達圖 */}
      <RadarChartComponent data={data} />

      {/* 數值詳細顯示 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "0.5rem",
          marginTop: "1.5rem",
          padding: "0 1rem",
          borderTop: "1px solid #e5e7eb",
          paddingTop: "1rem",
        }}
      >
        {data.map((item) => (
          <div
            key={item.name}
            style={{
              textAlign: "center",
              padding: "0.5rem",
              backgroundColor: "#f9fafb",
              borderRadius: "6px",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                marginBottom: "0.25rem",
              }}
            >
              {item.name}
            </div>
            <div
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "#3b82f6",
              }}
            >
              {item.value.toFixed(1)}
            </div>
            <div
              style={{
                fontSize: "0.625rem",
                color: "#9ca3af",
                marginTop: "0.125rem",
              }}
            >
              / 5.0
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CourseSummaryChart;
