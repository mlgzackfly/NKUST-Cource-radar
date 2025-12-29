"use client";

import { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";

type ActivityData = {
  monthlyReviews: Array<{ month: string; count: number }>;
  ratingDistribution: Array<{ rating: number; count: number }>;
};

export function UserActivityChart({ userId }: { userId: string }) {
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/users/${userId}/activity`)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch activity:", error);
        setLoading(false);
      });
  }, [userId]);

  if (loading || !data) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--app-muted)" }}>
        載入活動圖表中...
      </div>
    );
  }

  const monthlyChartOption = {
    title: {
      text: "評論發布趨勢（近 12 個月）",
      left: "center",
      textStyle: {
        fontSize: 14,
        fontWeight: 600,
      },
    },
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const month = params[0].axisValue;
        const count = params[0].value;
        return `${month}<br/>評論數: ${count}`;
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
      data: data.monthlyReviews.map((item) => item.month),
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
        name: "評論數",
        type: "bar",
        data: data.monthlyReviews.map((item) => item.count),
        itemStyle: {
          color: "#7E57C2",
        },
      },
    ],
  };

  const ratingChartOption = {
    title: {
      text: "涼度評分分佈",
      left: "center",
      textStyle: {
        fontSize: 14,
        fontWeight: 600,
      },
    },
    tooltip: {
      trigger: "item",
      formatter: "{a} <br/>{b}: {c} ({d}%)",
    },
    legend: {
      orient: "vertical",
      right: 10,
      top: "middle",
      textStyle: {
        fontSize: 12,
      },
    },
    series: [
      {
        name: "評分",
        type: "pie",
        radius: ["40%", "70%"],
        center: ["40%", "50%"],
        data: data.ratingDistribution.map((item) => ({
          value: item.count,
          name: `${item.rating || 0} 分`,
        })),
        itemStyle: {
          borderRadius: 8,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: "{b}: {c}",
        },
      },
    ],
  };

  return (
    <div>
      <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>活動分析</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div
          style={{
            padding: "1rem",
            backgroundColor: "white",
            borderRadius: "8px",
            border: "1px solid var(--ts-gray-200)",
          }}
        >
          <ReactECharts option={monthlyChartOption} style={{ height: "300px" }} />
        </div>
        {data.ratingDistribution.length > 0 && (
          <div
            style={{
              padding: "1rem",
              backgroundColor: "white",
              borderRadius: "8px",
              border: "1px solid var(--ts-gray-200)",
            }}
          >
            <ReactECharts option={ratingChartOption} style={{ height: "300px" }} />
          </div>
        )}
      </div>
    </div>
  );
}
