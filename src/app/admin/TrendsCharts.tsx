"use client";

import { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";

type TrendData = {
  date: string;
  count: number;
};

type TrendsResponse = {
  users: TrendData[];
  reviews: TrendData[];
  reports: TrendData[];
};

export function TrendsCharts() {
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats/trends")
      .then((res) => res.json())
      .then((data) => {
        setTrends(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch trends:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--app-muted)" }}>
        載入圖表中...
      </div>
    );
  }

  if (!trends) {
    return null;
  }

  // 使用者成長趨勢圖表選項
  const userChartOption = {
    title: {
      text: "使用者註冊趨勢（近 30 天）",
      left: "center",
      textStyle: {
        fontSize: 16,
        fontWeight: 600,
      },
    },
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const date = params[0].axisValue;
        const count = params[0].value;
        return `${date}<br/>註冊人數: ${count}`;
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: trends.users.map((item) => item.date.substring(5)),
      axisLabel: {
        rotate: 45,
        fontSize: 11,
      },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
    },
    series: [
      {
        name: "註冊人數",
        type: "line",
        smooth: true,
        itemStyle: {
          color: "#5CB3CC",
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(92, 179, 204, 0.3)" },
              { offset: 1, color: "rgba(92, 179, 204, 0.05)" },
            ],
          },
        },
        data: trends.users.map((item) => item.count),
      },
    ],
  };

  // 評論發布趨勢圖表選項
  const reviewChartOption = {
    title: {
      text: "評論發布趨勢（近 30 天）",
      left: "center",
      textStyle: {
        fontSize: 16,
        fontWeight: 600,
      },
    },
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const date = params[0].axisValue;
        const count = params[0].value;
        return `${date}<br/>發布數量: ${count}`;
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: trends.reviews.map((item) => item.date.substring(5)),
      axisLabel: {
        rotate: 45,
        fontSize: 11,
      },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
    },
    series: [
      {
        name: "發布數量",
        type: "line",
        smooth: true,
        itemStyle: {
          color: "#7E57C2",
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(126, 87, 194, 0.3)" },
              { offset: 1, color: "rgba(126, 87, 194, 0.05)" },
            ],
          },
        },
        data: trends.reviews.map((item) => item.count),
      },
    ],
  };

  // 檢舉趨勢圖表選項
  const reportChartOption = {
    title: {
      text: "檢舉數量趨勢（近 30 天）",
      left: "center",
      textStyle: {
        fontSize: 16,
        fontWeight: 600,
      },
    },
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const date = params[0].axisValue;
        const count = params[0].value;
        return `${date}<br/>檢舉數量: ${count}`;
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: trends.reports.map((item) => item.date.substring(5)),
      axisLabel: {
        rotate: 45,
        fontSize: 11,
      },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
    },
    series: [
      {
        name: "檢舉數量",
        type: "line",
        smooth: true,
        itemStyle: {
          color: "#EF5350",
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(239, 83, 80, 0.3)" },
              { offset: 1, color: "rgba(239, 83, 80, 0.05)" },
            ],
          },
        },
        data: trends.reports.map((item) => item.count),
      },
    ],
  };

  return (
    <div style={{ display: "grid", gap: "1.5rem", marginTop: "2rem" }}>
      {/* 使用者與評論趨勢並排 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "1.5rem",
        }}
      >
        <div className="ts-box" style={{ backgroundColor: "var(--ts-gray-50)" }}>
          <div className="ts-content" style={{ padding: "1rem" }}>
            <ReactECharts option={userChartOption} style={{ height: "300px" }} />
          </div>
        </div>

        <div className="ts-box" style={{ backgroundColor: "var(--ts-gray-50)" }}>
          <div className="ts-content" style={{ padding: "1rem" }}>
            <ReactECharts option={reviewChartOption} style={{ height: "300px" }} />
          </div>
        </div>
      </div>

      {/* 檢舉趨勢獨立一行 */}
      <div className="ts-box" style={{ backgroundColor: "var(--ts-gray-50)" }}>
        <div className="ts-content" style={{ padding: "1rem" }}>
          <ReactECharts option={reportChartOption} style={{ height: "300px" }} />
        </div>
      </div>
    </div>
  );
}
