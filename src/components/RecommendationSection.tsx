"use client";

import { useState, useEffect } from "react";
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

type RecommendationType = "all" | "collaborative" | "content" | "trending" | "personalized";

export function RecommendationSection() {
  const { data: session, status } = useSession();
  const [recommendations, setRecommendations] = useState<RecommendedCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<RecommendationType>("all");
  const [cached, setCached] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      fetchRecommendations(selectedType);
    }
  }, [status, selectedType]);

  const fetchRecommendations = async (type: RecommendationType) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/recommendations?type=${type}&limit=12`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch recommendations");
      }

      setRecommendations(data.recommendations || []);
      setCached(data.cached || false);
    } catch (err: any) {
      setError(err.message || "無法載入推薦");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return null;
  }

  if (!session) {
    return null;
  }

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case "COLLABORATIVE":
        return "協同推薦";
      case "CONTENT":
        return "相似課程";
      case "TRENDING":
        return "熱門課程";
      case "PERSONALIZED":
        return "個人化";
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
    <div className="ts-box is-raised" style={{ marginBottom: "2rem" }}>
      <div className="ts-content" style={{ padding: "2rem" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div className="ts-header" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              為你推薦
            </div>
            <div className="app-muted" style={{ fontSize: "0.9375rem" }}>
              {cached ? "📦 快取推薦" : "🎯 即時推薦"}
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="ts-wrap is-compact">
            <button
              onClick={() => setSelectedType("all")}
              className={`ts-button is-small ${selectedType === "all" ? "is-primary" : "is-outlined"}`}
            >
              全部
            </button>
            <button
              onClick={() => setSelectedType("collaborative")}
              className={`ts-button is-small ${selectedType === "collaborative" ? "is-primary" : "is-outlined"}`}
            >
              協同
            </button>
            <button
              onClick={() => setSelectedType("content")}
              className={`ts-button is-small ${selectedType === "content" ? "is-primary" : "is-outlined"}`}
            >
              相似
            </button>
            <button
              onClick={() => setSelectedType("trending")}
              className={`ts-button is-small ${selectedType === "trending" ? "is-primary" : "is-outlined"}`}
            >
              熱門
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--app-muted)" }}>
            載入推薦中...
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="ts-notice is-negative">
            <div className="content">{error}</div>
          </div>
        )}

        {/* Recommendations Grid */}
        {!loading && !error && recommendations.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
            {recommendations.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  className="ts-box is-outlined"
                  style={{
                    padding: "1.5rem",
                    height: "100%",
                    transition: "all 0.2s",
                    cursor: "pointer",
                    border: "2px solid var(--ts-gray-200)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--ts-primary-500)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--ts-gray-200)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Reason Badge */}
                  <div style={{ marginBottom: "0.75rem" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        backgroundColor: `color-mix(in srgb, ${getReasonColor(course.reason)} 15%, transparent)`,
                        color: getReasonColor(course.reason),
                      }}
                    >
                      {getReasonLabel(course.reason)}
                    </span>
                  </div>

                  {/* Course Name */}
                  <div style={{ fontWeight: 600, fontSize: "1.0625rem", marginBottom: "0.5rem", lineHeight: 1.4 }}>
                    {course.courseName}
                  </div>

                  {/* Course Info */}
                  <div style={{ fontSize: "0.875rem", color: "var(--app-muted)", marginBottom: "0.75rem" }}>
                    {course.department && <div>{course.department}</div>}
                    {course.instructors.length > 0 && (
                      <div>教師：{course.instructors.map((i) => i.name).join("、")}</div>
                    )}
                    {course.campus && <div>{course.campus} · {course.year}-{course.term}</div>}
                  </div>

                  {/* Credits */}
                  {course.credits !== null && (
                    <div style={{ fontSize: "0.875rem", color: "var(--ts-primary-600)", fontWeight: 600 }}>
                      {course.credits} 學分
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && recommendations.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🤔</div>
            <div className="ts-header" style={{ marginBottom: "0.5rem" }}>暫無推薦</div>
            <div className="app-muted">
              開始瀏覽課程、收藏或評論，我們會為您推薦更多相關課程！
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
