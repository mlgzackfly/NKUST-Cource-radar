"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type RecommendedCourse = {
  id: string;
  courseName: string;
  courseCode: string | null;
  department: string | null;
  campus: string | null;
  year: string;
  term: string;
  credits: number | null;
  instructors: Array<{ id: string; name: string }>;
  score: number;
  reason: string;
};

export function RecommendationSection() {
  const { data: session, status } = useSession();
  const [recommendations, setRecommendations] = useState<RecommendedCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchRecommendations();
    }
  }, [status]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/recommendations?type=all&limit=12");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch recommendations");
      }

      setRecommendations(data.recommendations || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "無法載入推薦";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 自動滑動功能
  const startAutoScroll = useCallback(() => {
    if (autoScrollRef.current) return;

    autoScrollRef.current = setInterval(() => {
      if (scrollRef.current && !isPaused) {
        const container = scrollRef.current;
        const maxScroll = container.scrollWidth - container.clientWidth;

        if (container.scrollLeft >= maxScroll - 10) {
          container.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          container.scrollBy({ left: 280, behavior: "smooth" });
        }
      }
    }, 4000);
  }, [isPaused]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (recommendations.length > 0 && !isPaused) {
      startAutoScroll();
    }
    return () => stopAutoScroll();
  }, [recommendations.length, isPaused, startAutoScroll, stopAutoScroll]);

  const scrollLeftHandler = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -280, behavior: "smooth" });
    }
  };

  const scrollRightHandler = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 280, behavior: "smooth" });
    }
  };

  // 未登入或載入中不顯示
  if (status === "loading" || !session) {
    return null;
  }

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case "COLLABORATIVE":
        return "同學都在看";
      case "CONTENT":
        return "你可能有興趣";
      case "TRENDING":
        return "熱門課程";
      case "PERSONALIZED":
        return "為你精選";
      default:
        return "推薦";
    }
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case "COLLABORATIVE":
        return "var(--ts-primary-500)";
      case "CONTENT":
        return "var(--ts-info-500)";
      case "TRENDING":
        return "var(--ts-warning-500)";
      case "PERSONALIZED":
        return "var(--ts-positive-500)";
      default:
        return "var(--ts-gray-500)";
    }
  };

  return (
    <div
      className="ts-box is-raised"
      style={{ marginBottom: "2rem", overflow: "hidden" }}
    >
      <div style={{ padding: "1.5rem 0" }}>
        {/* 標題區 */}
        <div
          style={{
            marginBottom: "1rem",
            padding: "0 1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              className="ts-header"
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                marginBottom: "0.25rem",
              }}
            >
              為你推薦
            </div>
            <div className="app-muted" style={{ fontSize: "0.875rem" }}>
              根據你的系所與學習偏好推薦
            </div>
          </div>

          {/* 左右滑動按鈕 */}
          {!loading && recommendations.length > 0 && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={scrollLeftHandler}
                className="ts-button is-icon is-outlined is-small"
                style={{ borderRadius: "50%", width: "36px", height: "36px" }}
                aria-label="往左"
              >
                <span style={{ fontSize: "1rem" }}>←</span>
              </button>
              <button
                onClick={scrollRightHandler}
                className="ts-button is-icon is-outlined is-small"
                style={{ borderRadius: "50%", width: "36px", height: "36px" }}
                aria-label="往右"
              >
                <span style={{ fontSize: "1rem" }}>→</span>
              </button>
            </div>
          )}
        </div>

        {/* 載入中 */}
        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              color: "var(--app-muted)",
            }}
          >
            載入中...
          </div>
        )}

        {/* 錯誤訊息 */}
        {error && !loading && (
          <div className="ts-notice is-negative" style={{ margin: "0 1.5rem" }}>
            <div className="content">{error}</div>
          </div>
        )}

        {/* 水平滑動課程列表 */}
        {!loading && !error && recommendations.length > 0 && (
          <div
            ref={scrollRef}
            onMouseEnter={() => {
              setIsPaused(true);
              stopAutoScroll();
            }}
            onMouseLeave={() => setIsPaused(false)}
            className="recommendation-carousel"
            style={{
              display: "flex",
              gap: "1rem",
              overflowX: "auto",
              scrollSnapType: "x mandatory",
              scrollBehavior: "smooth",
              paddingTop: "0.5rem",
              paddingBottom: "1rem",
              scrollbarWidth: "none",
            }}
          >
            {recommendations.map((course, index) => (
              <div
                key={course.id}
                style={{
                  marginLeft: index === 0 ? "1.5rem" : undefined,
                  flexShrink: 0,
                }}
              >
              <Link
                href={`/courses/${course.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  flexShrink: 0,
                  scrollSnapAlign: "start",
                }}
              >
                <div
                  style={{
                    padding: "1.25rem",
                    width: "260px",
                    height: "180px",
                    display: "flex",
                    flexDirection: "column",
                    transition: "all 0.2s",
                    cursor: "pointer",
                    border: "2px solid var(--ts-gray-200)",
                    borderRadius: "12px",
                    backgroundColor: "var(--app-surface)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--ts-primary-500)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(0,0,0,0.1)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--ts-gray-200)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {/* 推薦原因標籤 */}
                  <div style={{ marginBottom: "0.5rem" }}>
                    <span
                      style={{
                        padding: "0.2rem 0.5rem",
                        borderRadius: "6px",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        backgroundColor: `color-mix(in srgb, ${getReasonColor(course.reason)} 15%, transparent)`,
                        color: getReasonColor(course.reason),
                      }}
                    >
                      {getReasonLabel(course.reason)}
                    </span>
                  </div>

                  {/* 課程名稱 */}
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "1rem",
                      marginBottom: "0.5rem",
                      lineHeight: 1.4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {course.courseName}
                  </div>

                  {/* 課程資訊 */}
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--app-muted)",
                      flex: 1,
                      overflow: "hidden",
                    }}
                  >
                    {course.department && (
                      <div
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {course.department}
                      </div>
                    )}
                    {course.instructors.length > 0 && (
                      <div
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {course.instructors.map((i) => i.name).join("、")}
                      </div>
                    )}
                  </div>

                  {/* 學分 */}
                  {course.credits !== null && (
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--ts-primary-600)",
                        fontWeight: 600,
                        marginTop: "auto",
                      }}
                    >
                      {course.credits} 學分
                    </div>
                  )}
                </div>
              </Link>
              </div>
            ))}
            {/* 右側間距 */}
            <div style={{ minWidth: "1.5rem", flexShrink: 0 }} aria-hidden="true" />
          </div>
        )}

        {/* 無推薦 */}
        {!loading && !error && recommendations.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎓</div>
            <div className="ts-header" style={{ marginBottom: "0.5rem" }}>
              還沒有推薦給你的課程
            </div>
            <div className="app-muted">
              多逛逛、收藏幾門課，我們就能更了解你的喜好！
            </div>
          </div>
        )}
      </div>

      {/* 隱藏滾動條的 CSS */}
      <style jsx>{`
        .recommendation-carousel::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
