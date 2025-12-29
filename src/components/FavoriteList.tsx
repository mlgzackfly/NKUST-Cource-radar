"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

// SVG 垃圾桶圖示
function TrashIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

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

type FilterOptions = {
  years: string[];
  terms: string[];
};

export default function FavoriteList() {
  const { data: session, status } = useSession();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState("");
  const [term, setTerm] = useState("");
  const [sort, setSort] = useState("latest");
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ years: [], terms: [] });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // 載入篩選選項
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const res = await fetch("/api/courses/filters");
        if (res.ok) {
          const data = await res.json();
          setFilterOptions({
            years: data.years || [],
            terms: data.terms || [],
          });
        }
      } catch (err) {
        console.error("Error loading filter options:", err);
      }
    }
    loadFilterOptions();
  }, []);

  // 載入收藏列表
  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSelectedIds(new Set());

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
  }, [year, term, sort]);

  // 初始載入
  useEffect(() => {
    if (status === "authenticated") {
      loadFavorites();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, loadFavorites]);

  // 刪除單一收藏
  const handleRemove = async (favoriteId: string) => {
    try {
      const res = await fetch(`/api/favorites/${favoriteId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "取消收藏失敗");
      }

      // 從列表中移除
      setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(favoriteId);
        return next;
      });
    } catch (err) {
      console.error("Error removing favorite:", err);
      alert((err as Error).message);
    }
  };

  // 批次刪除選中的收藏
  const handleBatchRemove = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`確定要取消收藏這 ${selectedIds.size} 門課程嗎？`)) {
      return;
    }

    setDeleting(true);
    try {
      const deletePromises = Array.from(selectedIds).map((id) =>
        fetch(`/api/favorites/${id}`, { method: "DELETE" })
      );

      await Promise.all(deletePromises);

      // 從列表中移除
      setFavorites((prev) => prev.filter((f) => !selectedIds.has(f.id)));
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Error batch removing favorites:", err);
      alert("部分刪除失敗，請重新整理頁面");
    } finally {
      setDeleting(false);
    }
  };

  // 切換選中狀態
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 全選/取消全選
  const toggleSelectAll = () => {
    if (selectedIds.size === favorites.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(favorites.map((f) => f.id)));
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
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "1rem",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.813rem",
                marginBottom: "0.5rem",
                color: "var(--app-muted)",
              }}
            >
              學年
            </label>
            <div className="ts-select is-fluid">
              <select value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">全部學年</option>
                {filterOptions.years.map((y) => (
                  <option key={y} value={y}>
                    {y} 學年
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.813rem",
                marginBottom: "0.5rem",
                color: "var(--app-muted)",
              }}
            >
              學期
            </label>
            <div className="ts-select is-fluid">
              <select value={term} onChange={(e) => setTerm(e.target.value)}>
                <option value="">全部學期</option>
                {filterOptions.terms.map((t) => (
                  <option key={t} value={t}>
                    第 {t} 學期
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.813rem",
                marginBottom: "0.5rem",
                color: "var(--app-muted)",
              }}
            >
              排序方式
            </label>
            <div className="ts-select is-fluid">
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="latest">最新收藏</option>
                <option value="oldest">最早收藏</option>
                <option value="name">課程名稱</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 批次操作列 */}
      {!loading && favorites.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            backgroundColor: "var(--app-surface)",
            borderRadius: "8px",
            border: "1px solid var(--app-border)",
          }}
        >
          <label
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={selectedIds.size === favorites.length && favorites.length > 0}
              onChange={toggleSelectAll}
              style={{ width: "18px", height: "18px" }}
            />
            <span style={{ fontSize: "0.875rem" }}>
              {selectedIds.size > 0 ? `已選取 ${selectedIds.size} 項` : "全選"}
            </span>
          </label>

          {selectedIds.size > 0 && (
            <button
              className="ts-button is-small is-negative is-outlined"
              onClick={handleBatchRemove}
              disabled={deleting}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <TrashIcon size={14} />
              {deleting ? "刪除中..." : `刪除選取 (${selectedIds.size})`}
            </button>
          )}
        </div>
      )}

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
            {year || term ? "沒有符合篩選條件的收藏" : "目前還沒有收藏任何課程"}
          </div>
          <Link href="/courses" className="ts-button is-outlined">
            前往課程列表
          </Link>
        </div>
      )}

      {!loading && favorites.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {favorites.map((favorite) => {
            const avgRating = calculateAvgRating(favorite.course.summary);
            const isSelected = selectedIds.has(favorite.id);

            return (
              <div
                key={favorite.id}
                className="ts-box"
                style={{
                  padding: "1rem 1.25rem",
                  backgroundColor: "var(--app-surface)",
                  transition: "box-shadow 200ms, border-color 200ms",
                  borderColor: isSelected ? "var(--ts-primary-500)" : undefined,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "1rem",
                  }}
                >
                  {/* 選取框 */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(favorite.id)}
                    style={{
                      width: "18px",
                      height: "18px",
                      marginTop: "0.25rem",
                      cursor: "pointer",
                    }}
                  />

                  {/* 課程資訊 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "0.5rem",
                      }}
                    >
                      <Link
                        href={`/courses/${favorite.course.id}`}
                        style={{
                          fontSize: "1rem",
                          fontWeight: 600,
                          color: "var(--ts-primary-500)",
                          textDecoration: "none",
                        }}
                      >
                        {favorite.course.courseName}
                      </Link>

                      {avgRating && (
                        <span
                          style={{
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            color: "var(--ts-primary-500)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ★ {avgRating}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: "0.813rem",
                        color: "var(--app-muted)",
                        marginTop: "0.375rem",
                      }}
                    >
                      {favorite.course.courseCode && `${favorite.course.courseCode} · `}
                      {favorite.course.year} 學年第 {favorite.course.term} 學期
                      {favorite.course.credits && ` · ${favorite.course.credits} 學分`}
                      {favorite.course.summary.count > 0 &&
                        ` · ${favorite.course.summary.count} 則評論`}
                    </div>

                    {favorite.course.instructors.length > 0 && (
                      <div style={{ fontSize: "0.813rem", marginTop: "0.375rem" }}>
                        {favorite.course.instructors.map((i, idx) => (
                          <span key={i.id}>
                            <Link
                              href={`/instructors/${i.id}`}
                              style={{
                                color: "var(--app-text)",
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
                      <div
                        style={{
                          fontSize: "0.813rem",
                          marginTop: "0.375rem",
                          color: "var(--app-muted)",
                        }}
                      >
                        {favorite.course.time}
                        {favorite.course.classroom && ` @ ${favorite.course.classroom}`}
                      </div>
                    )}
                  </div>

                  {/* 刪除按鈕 */}
                  <button
                    className="ts-button is-small is-ghost"
                    onClick={() => handleRemove(favorite.id)}
                    style={{ color: "var(--ts-negative-500)", padding: "0.5rem" }}
                    title="取消收藏"
                  >
                    <TrashIcon size={16} />
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
