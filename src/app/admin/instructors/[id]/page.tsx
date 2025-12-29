"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const ReactEChartsCore = dynamic(
  () => import("echarts-for-react/lib/core").then((m) => m.default),
  { ssr: false }
);

interface InstructorDetail {
  instructor: {
    id: string;
    name: string;
    createdAt: string;
  };
  summary: {
    totalCourses: number;
    totalReviews: number;
    activeReviews: number;
    hiddenReviews: number;
    removedReviews: number;
    reviewsWithOpenReports: number;
  };
  courses: Array<{
    id: string;
    name: string;
    code: string;
    semester: string;
    campus: string;
    unit: string;
    reviewCount: number;
  }>;
  reviews: Array<{
    id: string;
    courseId: string;
    courseName: string;
    courseCode: string;
    status: string;
    createdAt: string;
    coolness: number | null;
    usefulness: number | null;
    workload: number | null;
    attendance: number | null;
    grading: number | null;
    body: string | null;
    authorDept: string | null;
    openReports: number;
    helpfulVotes: number;
    comments: number;
  }>;
  semesterTrends: Array<{
    semester: string;
    count: number;
    avgCoolness: number | null;
    avgUsefulness: number | null;
    avgWorkload: number | null;
    avgAttendance: number | null;
    avgGrading: number | null;
  }>;
  ratingDistribution: {
    coolness: number[];
    usefulness: number[];
    workload: number[];
    attendance: number[];
    grading: number[];
  };
}

export default function AdminInstructorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<InstructorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "courses" | "reviews">("overview");
  const [echarts, setEcharts] = useState<any>(null);

  useEffect(() => {
    // 動態載入 echarts
    import("echarts/core").then(async (ec) => {
      const { BarChart, LineChart, RadarChart } = await import("echarts/charts");
      const { GridComponent, TooltipComponent, LegendComponent, RadarComponent } =
        await import("echarts/components");
      const { CanvasRenderer } = await import("echarts/renderers");

      ec.use([
        BarChart,
        LineChart,
        RadarChart,
        GridComponent,
        TooltipComponent,
        LegendComponent,
        RadarComponent,
        CanvasRenderer,
      ]);

      setEcharts(ec);
    });
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/admin/instructors/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("教師不存在");
          } else {
            setError("載入失敗");
          }
          return;
        }
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError("網路錯誤");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <div className="ts-loading is-large" />
        <p style={{ marginTop: "1rem", color: "var(--ts-gray-500)" }}>載入中...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p style={{ color: "var(--ts-negative-500)", fontSize: "1.25rem" }}>
          {error || "載入失敗"}
        </p>
        <Link
          href="/admin/instructors"
          className="ts-button is-outlined"
          style={{ marginTop: "1rem" }}
        >
          返回列表
        </Link>
      </div>
    );
  }

  const { instructor, summary, courses, reviews, semesterTrends, ratingDistribution } = data;

  // 趨勢圖配置
  const trendChartOption = {
    tooltip: {
      trigger: "axis",
    },
    legend: {
      data: ["評論數", "平均評分"],
      bottom: 0,
    },
    xAxis: {
      type: "category",
      data: semesterTrends.map((t) => t.semester),
    },
    yAxis: [
      {
        type: "value",
        name: "評論數",
        position: "left",
      },
      {
        type: "value",
        name: "平均評分",
        position: "right",
        min: 1,
        max: 5,
      },
    ],
    series: [
      {
        name: "評論數",
        type: "bar",
        data: semesterTrends.map((t) => t.count),
        yAxisIndex: 0,
      },
      {
        name: "平均評分",
        type: "line",
        data: semesterTrends.map((t) => {
          const ratings = [
            t.avgCoolness,
            t.avgUsefulness,
            t.avgWorkload,
            t.avgAttendance,
            t.avgGrading,
          ].filter((r): r is number => r !== null);
          return ratings.length > 0
            ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
            : null;
        }),
        yAxisIndex: 1,
      },
    ],
  };

  // 分佈圖配置
  const distributionChartOption = {
    tooltip: {
      trigger: "axis",
    },
    legend: {
      data: ["風趣度", "實用性", "負擔度", "點名嚴格", "給分甜度"],
      bottom: 0,
    },
    xAxis: {
      type: "category",
      data: ["1分", "2分", "3分", "4分", "5分"],
    },
    yAxis: {
      type: "value",
    },
    series: [
      { name: "風趣度", type: "bar", data: ratingDistribution.coolness },
      { name: "實用性", type: "bar", data: ratingDistribution.usefulness },
      { name: "負擔度", type: "bar", data: ratingDistribution.workload },
      { name: "點名嚴格", type: "bar", data: ratingDistribution.attendance },
      { name: "給分甜度", type: "bar", data: ratingDistribution.grading },
    ],
  };

  return (
    <div>
      {/* 頂部導航 */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href="/admin/instructors"
          style={{ color: "var(--ts-primary-500)", textDecoration: "none" }}
        >
          ← 返回教師列表
        </Link>
      </div>

      {/* 教師資訊 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            {instructor.name}
          </h1>
          <p style={{ color: "var(--ts-gray-500)" }}>教師 ID: {instructor.id}</p>
        </div>
      </div>

      {/* 統計摘要 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <StatBox label="課程數" value={summary.totalCourses} />
        <StatBox label="總評論" value={summary.totalReviews} />
        <StatBox label="顯示中" value={summary.activeReviews} color="var(--ts-positive-500)" />
        <StatBox label="已隱藏" value={summary.hiddenReviews} color="var(--ts-warning-500)" />
        <StatBox label="已移除" value={summary.removedReviews} color="var(--ts-negative-500)" />
        <StatBox
          label="待處理檢舉"
          value={summary.reviewsWithOpenReports}
          color="var(--ts-negative-500)"
        />
      </div>

      {/* 分頁籤 */}
      <div className="ts-tab is-pilled" style={{ marginBottom: "1.5rem" }}>
        <button
          type="button"
          className={`item ${activeTab === "overview" ? "is-active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          總覽
        </button>
        <button
          type="button"
          className={`item ${activeTab === "courses" ? "is-active" : ""}`}
          onClick={() => setActiveTab("courses")}
        >
          課程 ({courses.length})
        </button>
        <button
          type="button"
          className={`item ${activeTab === "reviews" ? "is-active" : ""}`}
          onClick={() => setActiveTab("reviews")}
        >
          評論 ({reviews.length})
        </button>
      </div>

      {/* 內容區 */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* 趨勢圖 */}
          {echarts && semesterTrends.length > 0 && (
            <div className="ts-box" style={{ padding: "1.5rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
                學期趨勢
              </h3>
              <ReactEChartsCore
                echarts={echarts}
                option={trendChartOption}
                style={{ height: "300px" }}
              />
            </div>
          )}

          {/* 分佈圖 */}
          {echarts && (
            <div className="ts-box" style={{ padding: "1.5rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
                評分分佈
              </h3>
              <ReactEChartsCore
                echarts={echarts}
                option={distributionChartOption}
                style={{ height: "300px" }}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === "courses" && (
        <div className="ts-box" style={{ overflow: "auto" }}>
          <table className="ts-table is-striped" style={{ width: "100%", minWidth: "600px" }}>
            <thead>
              <tr>
                <th>課程名稱</th>
                <th>課程代碼</th>
                <th>學期</th>
                <th>校區</th>
                <th style={{ textAlign: "center" }}>評論數</th>
                <th style={{ textAlign: "center" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id}>
                  <td style={{ fontWeight: 500 }}>{course.name}</td>
                  <td style={{ color: "var(--ts-gray-500)" }}>{course.code}</td>
                  <td>{course.semester}</td>
                  <td>{course.campus}</td>
                  <td style={{ textAlign: "center" }}>{course.reviewCount}</td>
                  <td style={{ textAlign: "center" }}>
                    <Link
                      href={`/courses/${course.id}`}
                      className="ts-button is-small is-outlined"
                      target="_blank"
                    >
                      查看課程
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "reviews" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {reviews.length === 0 ? (
            <div
              className="ts-box"
              style={{ padding: "2rem", textAlign: "center", color: "var(--ts-gray-500)" }}
            >
              目前沒有評論
            </div>
          ) : (
            reviews.map((review) => (
              <div
                key={review.id}
                className="ts-box"
                style={{
                  padding: "1rem",
                  borderLeft: `4px solid ${
                    review.status === "ACTIVE"
                      ? "var(--ts-positive-500)"
                      : review.status === "HIDDEN"
                        ? "var(--ts-warning-500)"
                        : "var(--ts-negative-500)"
                  }`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600 }}>{review.courseName}</span>
                    <span style={{ color: "var(--ts-gray-500)", marginLeft: "0.5rem" }}>
                      {review.courseCode}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {review.openReports > 0 && (
                      <span className="ts-badge is-negative is-small">
                        {review.openReports} 檢舉
                      </span>
                    )}
                    <span
                      className={`ts-badge is-small ${
                        review.status === "ACTIVE"
                          ? "is-positive"
                          : review.status === "HIDDEN"
                            ? "is-warning"
                            : "is-negative"
                      }`}
                    >
                      {review.status === "ACTIVE"
                        ? "顯示中"
                        : review.status === "HIDDEN"
                          ? "已隱藏"
                          : "已移除"}
                    </span>
                  </div>
                </div>

                {/* 評分 */}
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    flexWrap: "wrap",
                    marginBottom: "0.75rem",
                    fontSize: "0.875rem",
                  }}
                >
                  {review.coolness !== null && <span>風趣度: {review.coolness}</span>}
                  {review.usefulness !== null && <span>實用性: {review.usefulness}</span>}
                  {review.workload !== null && <span>負擔度: {review.workload}</span>}
                  {review.attendance !== null && <span>點名: {review.attendance}</span>}
                  {review.grading !== null && <span>給分: {review.grading}</span>}
                </div>

                {/* 評論內容 */}
                {review.body && (
                  <p
                    style={{
                      color: "var(--ts-gray-700)",
                      marginBottom: "0.75rem",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {review.body}
                  </p>
                )}

                {/* 底部資訊 */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.813rem",
                    color: "var(--ts-gray-500)",
                  }}
                >
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <span>{new Date(review.createdAt).toLocaleDateString("zh-TW")}</span>
                    {review.authorDept && <span>來自: {review.authorDept}</span>}
                  </div>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <span>👍 {review.helpfulVotes}</span>
                    <span>💬 {review.comments}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="ts-box" style={{ padding: "1rem", textAlign: "center" }}>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: color || "var(--ts-gray-800)" }}>
        {value}
      </div>
      <div style={{ fontSize: "0.875rem", color: "var(--ts-gray-500)" }}>{label}</div>
    </div>
  );
}
