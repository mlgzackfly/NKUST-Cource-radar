"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Review = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  coolness: number | null;
  usefulness: number | null;
  workload: number | null;
  attendance: number | null;
  grading: number | null;
  body: string | null;
  authorDept: string | null;
  user: { id: string; email: string; bannedAt: string | null };
  course: {
    id: string;
    courseName: string;
    courseCode: string;
    instructors: Array<{ instructor: { name: string } }>;
  };
  _count: {
    helpfulVotes: number;
    reports: number;
  };
};

export default function ReviewsManagePage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchReviews();
  }, [statusFilter, page]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", page.toString());

      const res = await fetch(`/api/admin/reviews?${params}`);
      const data = await res.json();

      setReviews(data.reviews || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReviews();
  };

  const handleAction = async (reviewId: string, action: "hide" | "unhide" | "remove") => {
    const actionText = action === "hide" ? "隱藏" : action === "unhide" ? "恢復" : "移除";
    if (!confirm(`確定要${actionText}此評論嗎？`)) return;

    setProcessing(reviewId);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });

      if (res.ok) {
        alert(`${actionText}成功`);
        fetchReviews();
      } else {
        alert(`${actionText}失敗`);
      }
    } catch (error) {
      console.error("Failed to handle review:", error);
      alert(`${actionText}失敗`);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <span className="ts-badge is-positive">顯示中</span>;
      case "HIDDEN":
        return <span className="ts-badge is-warning">已隱藏</span>;
      case "REMOVED":
        return <span className="ts-badge is-negative">已移除</span>;
      default:
        return <span className="ts-badge">{status}</span>;
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1.5rem" }}>評論管理</h1>

      {/* 搜尋與篩選 */}
      <div style={{ marginBottom: "1.5rem" }}>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <div className="ts-input is-fluid" style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="搜尋課程名稱、課程代碼或評論內容..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="ts-button is-primary">搜尋</button>
        </form>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={() => { setStatusFilter(""); setPage(1); }}
            className={`ts-button ${!statusFilter ? "is-primary" : "is-outlined"}`}
          >
            全部
          </button>
          <button
            onClick={() => { setStatusFilter("ACTIVE"); setPage(1); }}
            className={`ts-button ${statusFilter === "ACTIVE" ? "is-primary" : "is-outlined"}`}
          >
            顯示中
          </button>
          <button
            onClick={() => { setStatusFilter("HIDDEN"); setPage(1); }}
            className={`ts-button ${statusFilter === "HIDDEN" ? "is-primary" : "is-outlined"}`}
          >
            已隱藏
          </button>
          <button
            onClick={() => { setStatusFilter("REMOVED"); setPage(1); }}
            className={`ts-button ${statusFilter === "REMOVED" ? "is-primary" : "is-outlined"}`}
          >
            已移除
          </button>
        </div>
      </div>

      {/* 評論列表 */}
      {loading ? (
        <div>載入中...</div>
      ) : reviews.length === 0 ? (
        <div className="ts-box">
          <div className="ts-content" style={{ padding: "2rem", textAlign: "center" }}>
            沒有符合條件的評論
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gap: "1rem", marginBottom: "1.5rem" }}>
            {reviews.map(review => (
              <div key={review.id} className="ts-box">
                <div className="ts-content" style={{ padding: "1.5rem" }}>
                  {/* 標題列 */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <Link
                          href={`/courses/${review.course.id}`}
                          style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--ts-primary-500)" }}
                        >
                          {review.course.courseName}
                        </Link>
                        {getStatusBadge(review.status)}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "var(--app-muted)" }}>
                        {review.course.courseCode} | {review.course.instructors.map(i => i.instructor.name).join(", ")}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: "0.875rem", color: "var(--app-muted)" }}>
                      <div>{new Date(review.createdAt).toLocaleString()}</div>
                      {review.authorDept && <div>{review.authorDept}</div>}
                    </div>
                  </div>

                  {/* 評分 */}
                  <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", fontSize: "0.875rem" }}>
                    {review.coolness && <span>涼度: {review.coolness}</span>}
                    {review.usefulness && <span>實用性: {review.usefulness}</span>}
                    {review.workload && <span>作業量: {review.workload}</span>}
                    {review.attendance && <span>點名: {review.attendance}</span>}
                    {review.grading && <span>給分: {review.grading}</span>}
                  </div>

                  {/* 評論內容 */}
                  {review.body && (
                    <div style={{
                      padding: "1rem",
                      backgroundColor: "var(--ts-gray-100)",
                      borderRadius: "8px",
                      marginBottom: "1rem",
                      fontSize: "0.938rem",
                      lineHeight: 1.6
                    }}>
                      {review.body}
                    </div>
                  )}

                  {/* 統計與使用者 */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "0.875rem", color: "var(--app-muted)" }}>
                      👤 {review.user.email}
                      {review.user.bannedAt && <span style={{ color: "var(--ts-negative-500)" }}> (已封禁)</span>}
                      <span style={{ marginLeft: "1rem" }}>👍 {review._count.helpfulVotes} 次投票</span>
                      <span style={{ marginLeft: "1rem" }}>🚩 {review._count.reports} 次檢舉</span>
                    </div>

                    {/* 操作按鈕 */}
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {review.status === "ACTIVE" && (
                        <>
                          <button
                            onClick={() => handleAction(review.id, "hide")}
                            className="ts-button is-small is-warning"
                            disabled={processing === review.id}
                          >
                            隱藏
                          </button>
                          <button
                            onClick={() => handleAction(review.id, "remove")}
                            className="ts-button is-small is-negative"
                            disabled={processing === review.id}
                          >
                            移除
                          </button>
                        </>
                      )}
                      {review.status === "HIDDEN" && (
                        <>
                          <button
                            onClick={() => handleAction(review.id, "unhide")}
                            className="ts-button is-small is-positive"
                            disabled={processing === review.id}
                          >
                            恢復
                          </button>
                          <button
                            onClick={() => handleAction(review.id, "remove")}
                            className="ts-button is-small is-negative"
                            disabled={processing === review.id}
                          >
                            移除
                          </button>
                        </>
                      )}
                      {review.status === "REMOVED" && (
                        <button
                          onClick={() => handleAction(review.id, "unhide")}
                          className="ts-button is-small is-positive"
                          disabled={processing === review.id}
                        >
                          恢復
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 分頁 */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="ts-button is-outlined"
                disabled={page === 1}
              >
                上一頁
              </button>
              <span style={{ padding: "0.5rem 1rem", display: "flex", alignItems: "center" }}>
                第 {page} / {totalPages} 頁
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="ts-button is-outlined"
                disabled={page === totalPages}
              >
                下一頁
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
