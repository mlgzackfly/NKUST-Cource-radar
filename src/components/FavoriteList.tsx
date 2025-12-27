"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type RatingSummary = {
  count: number;
  avg: {
    coolness: number | null;
    usefulness: number | null;
    workload: number | null;
    attendance: number | null;
    grading: number | null;
  };
};

type Favorite = {
  id: string;
  createdAt: string;
  course: {
    id: string;
    courseName: string;
    courseCode: string | null;
    year: string;
    term: string;
    credits: number | null;
    time: string | null;
    classroom: string | null;
    instructors: Array<{ id: string; name: string }>;
    summary: RatingSummary;
  };
};

type FavoriteListProps = {
  initialYear?: string;
  initialTerm?: string;
};

export default function FavoriteList({ initialYear, initialTerm }: FavoriteListProps) {
  const { data: session, status } = useSession();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(initialYear || "");
  const [term, setTerm] = useState(initialTerm || "");
  const [sort, setSort] = useState("latest");

  // 載入收藏列表
  const loadFavorites = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL("/api/favorites", window.location.origin);
      if (year) url.searchParams.set("year", year);
      if (term) url.searchParams.set("term", term);
      if (sort) url.searchParams.set("sort", sort);

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "載入收藏失敗");
      }

      setFavorites(data.favorites);
    } catch (err) {
      console.error("Error loading favorites:", err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 初始載入
  useEffect(() => {
    if (status === "authenticated") {
      loadFavorites();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, year, term, sort]);

  // 刪除收藏
  const handleRemove = async (favoriteId: string) => {
    if (!confirm("確定要取消收藏此課程嗎？")) {
      return;
    }

    try {
      const res = await fetch(`/api/favorites/${favoriteId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "取消收藏失敗");
      }

      // 重新載入列表
      await loadFavorites();
    } catch (err) {
      console.error("Error removing favorite:", err);
      alert((err as Error).message);
    }
  };

  // 計算平均評分
  const calculateAvgRating = (summary: RatingSummary) => {
    const { avg } = summary;
    const values = [avg.coolness, avg.usefulness, avg.grading].filter(
      (v) => v !== null
    ) as number[];
    if (values.length === 0) return null;
    return (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1);
  };

  // 未登入
  if (status === "unauthenticated") {
    return (
      <div className="ts-box" style={{ padding: "2rem", textAlign: "center" }}>
        <div style={{ marginBottom: "1rem", color: "var(--app-muted)" }}>
          需要登入才能查看收藏列表
        </div>
        <Link href="/api/auth/signin" className="ts-button is-primary">
          登入
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* 篩選與排序 */}
      <div
        className="ts-box"
        style={{
          padding: "1rem",
          marginBottom: "1rem",
          backgroundColor: "var(--app-surface)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "1rem",
          }}
        >
          <div className="ts-control">
            <label className="label" style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
              學年
            </label>
            <input
              type="text"
              className="ts-input"
              placeholder="例：114"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          <div className="ts-control">
            <label className="label" style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
              學期
            </label>
            <input
              type="text"
              className="ts-input"
              placeholder="例：1"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </div>
          <div className="ts-control">
            <label className="label" style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
              排序
            </label>
            <select
              className="ts-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="latest">最新收藏</option>
              <option value="oldest">最早收藏</option>
              <option value="name">課程名稱</option>
            </select>
          </div>
        </div>
      </div>

      {/* 載入中 */}
      {loading && (
        <div className="ts-box" style={{ padding: "2rem", textAlign: "center" }}>
          載入中...
        </div>
      )}

      {/* 錯誤訊息 */}
      {error && (
        <div className="ts-notice is-negative" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {/* 收藏列表 */}
      {!loading && !error && favorites.length === 0 && (
        <div className="ts-box" style={{ padding: "2rem", textAlign: "center" }}>
          <div style={{ color: "var(--app-muted)", marginBottom: "1rem" }}>
            目前還沒有收藏任何課程
          </div>
          <Link href="/courses" className="ts-button is-outlined">
            前往課程列表
          </Link>
        </div>
      )}

      {!loading && favorites.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {favorites.map((favorite) => {
            const avgRating = calculateAvgRating(favorite.course.summary);
            return (
              <div
                key={favorite.id}
                className="ts-box"
                style={{
                  padding: "1.5rem",
                  backgroundColor: "var(--app-surface)",
                  transition: "box-shadow 200ms",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "1rem",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <Link
                      href={`/courses/${favorite.course.id}`}
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: 600,
                        color: "var(--ts-primary-500)",
                        textDecoration: "none",
                        marginBottom: "0.5rem",
                        display: "block",
                      }}
                    >
                      {favorite.course.courseName}
                    </Link>

                    <div
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--app-muted)",
                        marginBottom: "0.75rem",
                      }}
                    >
                      {favorite.course.courseCode && `${favorite.course.courseCode} · `}
                      {favorite.course.year} 學年第 {favorite.course.term} 學期
                      {favorite.course.credits && ` · ${favorite.course.credits} 學分`}
                    </div>

                    {favorite.course.instructors.length > 0 && (
                      <div style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                        <strong>教師：</strong>
                        {favorite.course.instructors.map((i, idx) => (
                          <span key={i.id}>
                            <Link
                              href={`/instructors/${i.id}`}
                              style={{
                                color: "var(--ts-primary-500)",
                                textDecoration: "none",
                              }}
                            >
                              {i.name}
                            </Link>
                            {idx < favorite.course.instructors.length - 1 && "、"}
                          </span>
                        ))}
                      </div>
                    )}

                    {favorite.course.time && (
                      <div style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                        <strong>時間：</strong>
                        {favorite.course.time}
                        {favorite.course.classroom && ` · ${favorite.course.classroom}`}
                      </div>
                    )}

                    {avgRating && (
                      <div style={{ fontSize: "0.875rem" }}>
                        <strong>平均評分：</strong>
                        <span style={{ color: "var(--ts-primary-500)", fontWeight: 600 }}>
                          {avgRating}
                        </span>
                        <span style={{ color: "var(--app-muted)" }}>
                          {" "}
                          / 5.0（{favorite.course.summary.count} 則評論）
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    className="ts-button is-small is-ghost"
                    onClick={() => handleRemove(favorite.id)}
                    style={{ color: "var(--ts-negative-500)" }}
                  >
                    <i className="icon is-trash"></i>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 總計 */}
      {!loading && favorites.length > 0 && (
        <div
          style={{
            textAlign: "center",
            marginTop: "1rem",
            fontSize: "0.875rem",
            color: "var(--app-muted)",
          }}
        >
          共收藏 {favorites.length} 門課程
        </div>
      )}
    </div>
  );
}
