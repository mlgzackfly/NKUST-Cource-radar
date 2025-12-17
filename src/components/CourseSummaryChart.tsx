"use client";

import { useEffect, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";

type SummaryData = {
  totalReviews: number;
  avg: {
    coolness: number | null;
    usefulness: number | null;
    workload: number | null;
    attendance: number | null;
  };
};

type CourseSummaryChartProps = {
  summary: SummaryData;
};

const CourseSummaryChart = ({ summary }: CourseSummaryChartProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  console.log("CourseSummaryChart - summary:", summary);
  console.log("Mounted:", mounted);

  // 如果沒有評論，顯示提示訊息
  if (summary.totalReviews === 0) {
    console.log("No reviews, showing empty state");
    return (
      <div style={{
        height: 300,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--app-muted)",
        textAlign: "center",
        padding: "2rem"
      }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.5 }}>📊</div>
        <div style={{ fontSize: "0.9375rem" }}>尚無評分資料</div>
        <div style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
          成為第一位評論者
        </div>
      </div>
    );
  }

  const data = [
    { subject: "涼度", value: summary.avg.coolness ?? 0, fullMark: 5 },
    { subject: "實用", value: summary.avg.usefulness ?? 0, fullMark: 5 },
    { subject: "作業量", value: summary.avg.workload ?? 0, fullMark: 5 },
    { subject: "出席", value: summary.avg.attendance ?? 0, fullMark: 5 },
  ];

  console.log("Chart data:", data);

  const fmt = (v: number | null) => (v === null ? "—" : v.toFixed(1));

  // 等待客戶端掛載後再渲染圖表
  if (!mounted) {
    return (
      <div style={{
        height: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--app-muted)"
      }}>
        載入圖表中...
      </div>
    );
  }

  // 暫時使用文字顯示替代圖表
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "1rem",
      padding: "1.5rem"
    }}>
      {data.map((item) => (
        <div
          key={item.subject}
          style={{
            textAlign: "center",
            padding: "1.5rem 1rem",
            backgroundColor: "var(--ts-gray-50)",
            borderRadius: "8px"
          }}
        >
          <div style={{ fontSize: "0.875rem", color: "var(--app-muted)", marginBottom: "0.5rem" }}>
            {item.subject}
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--ts-primary-500)" }}>
            {item.value.toFixed(1)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--app-muted)", marginTop: "0.25rem" }}>
            / 5.0
          </div>
        </div>
      ))}
    </div>
  );
};

export default CourseSummaryChart;
