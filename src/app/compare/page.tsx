"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";

// 動態載入 ECharts 避免 SSR 問題
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface CourseStats {
  id: string;
  courseName: string;
  courseCode: string | null;
  department: string | null;
  year: string;
  term: string;
  campus: string | null;
  credits: number | null;
  instructors: {
    instructor: {
      id: string;
      name: string;
    };
  }[];
  tags: {
    tag: {
      id: string;
      name: string;
      category: string;
    };
    score: number;
  }[];
  stats: {
    totalReviews: number;
    avgCoolness?: number;
    avgUsefulness?: number;
    avgWorkload?: number;
    avgAttendance?: number;
    avgGrading?: number;
  };
}

interface CompareResult {
  courses: CourseStats[];
  comparisonId: string;
  isAuthenticated: boolean;
}

// 評分顏色（1-5 星對應的顏色）
const getRatingColor = (rating: number) => {
  if (rating >= 4) return "var(--ts-positive-500)";
  if (rating >= 3) return "var(--ts-warning-500)";
  if (rating >= 2) return "var(--ts-gray-500)";
  return "var(--ts-negative-500)";
};

// 雷達圖顏色
const CHART_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
];

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ids = searchParams.get("ids");

  useEffect(() => {
    if (!ids) {
      setError("請選擇要比較的課程");
      setLoading(false);
      return;
    }

    const courseIds = ids.split(",").filter(Boolean);
    if (courseIds.length < 2) {
      setError("請至少選擇 2 門課程進行比較");
      setLoading(false);
      return;
    }

    if (courseIds.length > 4) {
      setError("最多只能比較 4 門課程");
      setLoading(false);
      return;
    }

    const fetchComparison = async () => {
      try {
        const response = await fetch("/api/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseIds }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "比較失敗");
        }

        const data = await response.json();
        setResult(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [ids]);

  if (loading) {
    return (
      <div className="app-container" style={{ padding: "2rem" }}>
        <div className="ts-box is-raised" style={{ padding: "3rem", textAlign: "center" }}>
          <div className="ts-loading is-large" />
          <p style={{ marginTop: "1rem", color: "var(--ts-gray-600)" }}>載入比較資料中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container" style={{ padding: "2rem" }}>
        <div className="ts-box is-raised" style={{ padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
          <h2 style={{ marginBottom: "0.5rem" }}>{error}</h2>
          <p style={{ color: "var(--ts-gray-600)", marginBottom: "1.5rem" }}>
            請返回課程列表選擇要比較的課程
          </p>
          <Link href="/courses" className="ts-button is-primary">
            返回課程列表
          </Link>
        </div>
      </div>
    );
  }

  if (!result || result.courses.length === 0) {
    return (
      <div className="app-container" style={{ padding: "2rem" }}>
        <div className="ts-box is-raised" style={{ padding: "2rem", textAlign: "center" }}>
          <p>沒有找到課程資料</p>
          <Link href="/courses" className="ts-button is-primary" style={{ marginTop: "1rem" }}>
            返回課程列表
          </Link>
        </div>
      </div>
    );
  }

  const { courses, isAuthenticated } = result;

  // 準備雷達圖資料（只有登入時才顯示）
  const radarOption = isAuthenticated ? {
    tooltip: {
      trigger: "item",
    },
    legend: {
      data: courses.map((c) => c.courseName),
      bottom: 0,
      textStyle: {
        fontSize: 12,
      },
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
        fontSize: 12,
      },
    },
    series: [
      {
        type: "radar",
        data: courses.map((course, index) => ({
          value: [
            course.stats.avgCoolness || 0,
            course.stats.avgUsefulness || 0,
            course.stats.avgWorkload || 0,
            course.stats.avgAttendance || 0,
            course.stats.avgGrading || 0,
          ],
          name: course.courseName,
          lineStyle: {
            color: CHART_COLORS[index % CHART_COLORS.length],
            width: 2,
          },
          areaStyle: {
            color: CHART_COLORS[index % CHART_COLORS.length],
            opacity: 0.2,
          },
          itemStyle: {
            color: CHART_COLORS[index % CHART_COLORS.length],
          },
        })),
      },
    ],
  } : null;

  return (
    <div className="app-container" style={{ padding: "2rem 1rem", paddingBottom: "4rem" }}>
      {/* 標題 */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
          <button onClick={() => router.back()} className="ts-button is-ghost is-icon" title="返回">
            <span className="ts-icon is-arrow-left-icon" />
          </button>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>課程比較</h1>
        </div>
        <p style={{ color: "var(--ts-gray-600)" }}>比較 {courses.length} 門課程的評分與資訊</p>
      </div>

      {/* 雷達圖（需登入） */}
      {isAuthenticated && radarOption ? (
        <div className="ts-box is-raised" style={{ marginBottom: "1.5rem" }}>
          <div className="ts-content">
            <h3 style={{ marginBottom: "1rem", fontWeight: 600 }}>評分雷達圖</h3>
            <div style={{ height: "350px" }}>
              <ReactECharts option={radarOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </div>
        </div>
      ) : (
        <div className="ts-box is-raised" style={{ marginBottom: "1.5rem" }}>
          <div className="ts-content" style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🔒</div>
            <h3 style={{ marginBottom: "0.5rem", fontWeight: 600 }}>詳細評分需要登入</h3>
            <p style={{ color: "var(--ts-gray-600)", marginBottom: "1rem" }}>
              登入高科大帳號後可查看涼度、實用性、負擔、出席、給分等詳細評分資訊
            </p>
            <Link href="/auth/signin" className="ts-button is-primary">
              登入查看
            </Link>
          </div>
        </div>
      )}

      {/* 詳細比較表格 */}
      <div className="ts-box is-raised" style={{ overflowX: "auto" }}>
        <div className="ts-content">
          <h3 style={{ marginBottom: "1rem", fontWeight: 600 }}>詳細比較</h3>
          <table className="ts-table is-basic" style={{ width: "100%", minWidth: "600px" }}>
            <thead>
              <tr>
                <th style={{ width: "120px" }}>項目</th>
                {courses.map((course, index) => (
                  <th
                    key={course.id}
                    style={{
                      borderBottom: `3px solid ${CHART_COLORS[index % CHART_COLORS.length]}`,
                    }}
                  >
                    <Link
                      href={`/courses/${course.id}`}
                      style={{ color: "inherit", textDecoration: "none" }}
                    >
                      {course.courseName}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* 基本資訊 */}
              <tr>
                <td style={{ fontWeight: 500 }}>系所</td>
                {courses.map((c) => (
                  <td key={c.id}>{c.department || "-"}</td>
                ))}
              </tr>
              <tr>
                <td style={{ fontWeight: 500 }}>學期</td>
                {courses.map((c) => (
                  <td key={c.id}>
                    {c.year}-{c.term}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ fontWeight: 500 }}>學分</td>
                {courses.map((c) => (
                  <td key={c.id}>{c.credits || "-"}</td>
                ))}
              </tr>
              <tr>
                <td style={{ fontWeight: 500 }}>教師</td>
                {courses.map((c) => (
                  <td key={c.id}>
                    {c.instructors.map((ci) => ci.instructor.name).join("、") || "-"}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ fontWeight: 500 }}>評論數</td>
                {courses.map((c) => (
                  <td key={c.id}>{c.stats.totalReviews}</td>
                ))}
              </tr>

              {/* 評分（需登入） */}
              {isAuthenticated ? (
                <>
                  <tr style={{ borderTop: "2px solid var(--ts-gray-200)" }}>
                    <td style={{ fontWeight: 600 }}>涼度</td>
                    {courses.map((c) => (
                      <td key={c.id}>
                        <span style={{ color: getRatingColor(c.stats.avgCoolness ?? 0), fontWeight: 600 }}>
                          {c.stats.avgCoolness != null && c.stats.avgCoolness > 0 ? c.stats.avgCoolness.toFixed(1) : "-"}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>實用性</td>
                    {courses.map((c) => (
                      <td key={c.id}>
                        <span style={{ color: getRatingColor(c.stats.avgUsefulness ?? 0), fontWeight: 600 }}>
                          {c.stats.avgUsefulness != null && c.stats.avgUsefulness > 0 ? c.stats.avgUsefulness.toFixed(1) : "-"}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>負擔</td>
                    {courses.map((c) => (
                      <td key={c.id}>
                        <span style={{ color: getRatingColor(c.stats.avgWorkload ?? 0), fontWeight: 600 }}>
                          {c.stats.avgWorkload != null && c.stats.avgWorkload > 0 ? c.stats.avgWorkload.toFixed(1) : "-"}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>出席</td>
                    {courses.map((c) => (
                      <td key={c.id}>
                        <span style={{ color: getRatingColor(c.stats.avgAttendance ?? 0), fontWeight: 600 }}>
                          {c.stats.avgAttendance != null && c.stats.avgAttendance > 0 ? c.stats.avgAttendance.toFixed(1) : "-"}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>給分</td>
                    {courses.map((c) => (
                      <td key={c.id}>
                        <span style={{ color: getRatingColor(c.stats.avgGrading ?? 0), fontWeight: 600 }}>
                          {c.stats.avgGrading != null && c.stats.avgGrading > 0 ? c.stats.avgGrading.toFixed(1) : "-"}
                        </span>
                      </td>
                    ))}
                  </tr>
                </>
              ) : (
                <tr style={{ borderTop: "2px solid var(--ts-gray-200)" }}>
                  <td style={{ fontWeight: 600 }}>評分</td>
                  <td colSpan={courses.length} style={{ textAlign: "center", color: "var(--ts-gray-500)" }}>
                    🔒 登入後可查看詳細評分
                  </td>
                </tr>
              )}

              {/* 標籤 */}
              <tr style={{ borderTop: "2px solid var(--ts-gray-200)" }}>
                <td style={{ fontWeight: 500 }}>標籤</td>
                {courses.map((c) => (
                  <td key={c.id}>
                    {c.tags.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                        {c.tags.slice(0, 3).map((t) => (
                          <span
                            key={t.tag.id}
                            className="ts-badge is-small"
                            style={{ fontSize: "0.75rem" }}
                          >
                            {t.tag.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 返回按鈕 */}
      <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
        <Link href="/courses" className="ts-button is-outlined">
          返回課程列表
        </Link>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="app-container" style={{ padding: "2rem", textAlign: "center" }}>
          <div className="ts-loading is-large" />
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
