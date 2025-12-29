"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Snackbar } from "./Snackbar";
import { CommentSection } from "./CommentSection";

type RatingValue = 1 | 2 | 3 | 4 | 5 | null;

type Review = {
  id: string;
  isOwnReview: boolean; // ✅ 使用布林值而非 userId
  createdAt: string;
  coolness: number | null;
  usefulness: number | null;
  workload: number | null;
  attendance: number | null;
  grading: number | null;
  body: string | null;
  authorDept: string | null;
  votes: {
    upvotes: number;
    downvotes: number;
    netScore: number;
    currentUserVote: "UPVOTE" | "DOWNVOTE" | null;
  };
};

type ReviewListProps = {
  reviews: Review[] | null;
  courseId: string;
};

export function ReviewList({ reviews, courseId }: ReviewListProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="ts-box is-raised">
        <div className="ts-content" style={{ padding: "3rem 2rem", textAlign: "center" }}>
          <div className="app-muted">載入中...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="ts-box is-raised">
        <div className="ts-content" style={{ padding: "3rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
          <div className="ts-header" style={{ marginBottom: "1rem" }}>
            登入查看評論
          </div>
          <div className="app-muted" style={{ marginBottom: "1.5rem" }}>
            為了保護評論者隱私，需要登入後才能查看完整評論內容
          </div>
          <Link href="/auth/signin" className="ts-button is-primary">
            登入查看
          </Link>
        </div>
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="ts-box is-raised">
        <div className="ts-content" style={{ padding: "3rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📝</div>
          <div className="ts-header" style={{ marginBottom: "0.5rem" }}>
            尚無評論
          </div>
          <div className="app-muted">成為第一位評論此課程的人！</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: "1.125rem", marginBottom: "1.5rem" }}>
        評論 ({reviews.length})
      </div>

      <div style={{ display: "grid", gap: "1.5rem" }}>
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            isOwner={review.isOwnReview}
            courseId={courseId}
          />
        ))}
      </div>
    </div>
  );
}

type ReviewCardProps = {
  review: Review;
  isOwner: boolean;
  courseId: string;
};

function ReviewCard({ review, isOwner, courseId }: ReviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [coolness, setCoolness] = useState<RatingValue>(review.coolness as RatingValue);
  const [usefulness, setUsefulness] = useState<RatingValue>(review.usefulness as RatingValue);
  const [workload, setWorkload] = useState<RatingValue>(review.workload as RatingValue);
  const [attendance, setAttendance] = useState<RatingValue>(review.attendance as RatingValue);
  const [grading, setGrading] = useState<RatingValue>(review.grading as RatingValue);
  const [body, setBody] = useState(review.body || "");
  const [authorDept, setAuthorDept] = useState(review.authorDept || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; type: "success" | "error" } | null>(
    null
  );
  const router = useRouter();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  const handleSave = async () => {
    if (!coolness && !usefulness && !workload && !attendance && !grading) {
      setError("至少需要填寫一項評分");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/reviews/${review.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coolness,
          usefulness,
          workload,
          attendance,
          grading,
          body: body.trim() || null,
          authorDept: authorDept.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "更新失敗");
      }

      setIsEditing(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "更新失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCoolness(review.coolness as RatingValue);
    setUsefulness(review.usefulness as RatingValue);
    setWorkload(review.workload as RatingValue);
    setAttendance(review.attendance as RatingValue);
    setGrading(review.grading as RatingValue);
    setBody(review.body || "");
    setAuthorDept(review.authorDept || "");
    setError(null);
    setIsEditing(false);
  };

  const confirmDelete = async () => {
    setLoading(true);
    setShowDeleteConfirm(false);
    try {
      const res = await fetch(`/api/reviews/${review.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "刪除失敗");
      }

      setSnackbar({ message: "評論已刪除", type: "success" });
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setSnackbar({ message: err.message || "刪除失敗，請稍後再試", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      setSnackbar({ message: "請輸入檢舉理由", type: "error" });
      return;
    }

    setReportLoading(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "檢舉失敗");
      }

      setSnackbar({ message: "檢舉已送出，感謝您的回報", type: "success" });
      setShowReportDialog(false);
      setReportReason("");
    } catch (err: any) {
      setSnackbar({ message: err.message || "檢舉失敗，請稍後再試", type: "error" });
    } finally {
      setReportLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className="ts-box is-raised">
        <div className="ts-content" style={{ padding: "1.5rem" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <div className="ts-header" style={{ fontSize: "1.125rem" }}>
              編輯評論
            </div>
          </div>

          {/* Rating Dimensions */}
          <div style={{ display: "grid", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <RatingInput label="涼度" value={coolness} onChange={setCoolness} />
            <RatingInput label="實用性" value={usefulness} onChange={setUsefulness} />
            <RatingInput label="作業量" value={workload} onChange={setWorkload} />
            <RatingInput label="點名" value={attendance} onChange={setAttendance} />
            <RatingInput label="給分甜度" value={grading} onChange={setGrading} />
          </div>

          {/* Text Review */}
          <div className="ts-control is-stacked" style={{ marginBottom: "1.5rem" }}>
            <div className="label">文字評論 (選填)</div>
            <div className="content">
              <textarea
                className="ts-input is-fluid"
                rows={6}
                placeholder="分享您的修課心得、優缺點、建議..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                style={{ resize: "vertical" }}
              />
            </div>
          </div>

          {/* Author Department */}
          <div className="ts-control is-stacked" style={{ marginBottom: "1.5rem" }}>
            <div className="label">您的系所 (選填)</div>
            <div className="content">
              <div className="ts-input is-fluid">
                <input
                  type="text"
                  placeholder="例：資訊工程系"
                  value={authorDept}
                  onChange={(e) => setAuthorDept(e.target.value)}
                  maxLength={50}
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="ts-notice is-negative" style={{ marginBottom: "1.5rem" }}>
              <div className="content">{error}</div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={handleSave} className="ts-button is-primary" disabled={loading}>
              {loading ? "儲存中..." : "儲存"}
            </button>
            <button onClick={handleCancel} className="ts-button is-outlined" disabled={loading}>
              取消
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ts-box is-raised">
      <div className="ts-content" style={{ padding: "1.5rem" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <div style={{ fontSize: "0.875rem", color: "var(--app-muted)" }}>
            {review.authorDept || "匿名使用者"} · {formatDate(review.createdAt)}
          </div>
          {isOwner && (
            <div style={{ display: "flex", gap: "0.75rem" }} className="mobile-button-group">
              <button
                onClick={() => setIsEditing(true)}
                className="ts-button is-ghost is-small"
                disabled={loading}
              >
                編輯
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="ts-button is-ghost is-small is-negative"
                disabled={loading}
              >
                刪除
              </button>
            </div>
          )}
        </div>

        {/* Ratings */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {review.coolness !== null && <RatingBadge label="涼度" value={review.coolness} />}
          {review.usefulness !== null && <RatingBadge label="實用" value={review.usefulness} />}
          {review.workload !== null && <RatingBadge label="作業量" value={review.workload} />}
          {review.attendance !== null && <RatingBadge label="點名" value={review.attendance} />}
          {review.grading !== null && <RatingBadge label="給分甜度" value={review.grading} />}
        </div>

        {/* Body */}
        {review.body && (
          <div
            style={{
              padding: "1rem",
              backgroundColor: "var(--app-surface)",
              borderRadius: "8px",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}
          >
            {review.body}
          </div>
        )}

        {/* 投票按鈕 */}
        <div
          style={{
            marginTop: "1rem",
            paddingTop: "1rem",
            borderTop: "1px solid var(--ts-gray-200)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <VoteButtons reviewId={review.id} votes={review.votes} isOwnReview={isOwner} />
            {!isOwner && (
              <button
                onClick={() => setShowReportDialog(true)}
                className="ts-button is-small is-outlined"
                disabled={loading}
              >
                🚩 檢舉
              </button>
            )}
          </div>

          {/* 留言區塊 */}
          <CommentSection reviewId={review.id} />
        </div>
      </div>

      {/* 檢舉對話框 */}
      {showReportDialog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowReportDialog(false);
              setReportReason("");
            }
          }}
        >
          <div
            className="ts-box"
            style={{
              width: "90%",
              maxWidth: "500px",
              maxHeight: "min(90vh, 600px)",
              overflowY: "auto",
              backgroundColor: "var(--ts-gray-50)",
            }}
          >
            <div className="ts-content" style={{ padding: "1.5rem" }}>
              <div className="ts-header" style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>
                檢舉評論
              </div>

              <div className="ts-control is-stacked" style={{ marginBottom: "1.5rem" }}>
                <div className="label">檢舉理由 (500字以內)</div>
                <div className="content">
                  <textarea
                    className="ts-input is-fluid"
                    rows={5}
                    placeholder="請說明檢舉理由，例如：內容不實、人身攻擊、違反使用規範..."
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    maxLength={500}
                    style={{ resize: "vertical" }}
                  />
                </div>
                <div
                  className="text"
                  style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--app-muted)" }}
                >
                  {reportReason.length}/500
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={handleReport}
                  className="ts-button is-negative"
                  disabled={reportLoading || !reportReason.trim()}
                >
                  {reportLoading ? "送出中..." : "送出檢舉"}
                </button>
                <button
                  onClick={() => {
                    setShowReportDialog(false);
                    setReportReason("");
                  }}
                  className="ts-button is-outlined"
                  disabled={reportLoading}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 刪除確認對話框 */}
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteConfirm(false);
            }
          }}
        >
          <div
            className="ts-box"
            style={{
              width: "90%",
              maxWidth: "400px",
              maxHeight: "min(90vh, 500px)",
              overflowY: "auto",
              backgroundColor: "var(--ts-gray-50)",
            }}
          >
            <div className="ts-content" style={{ padding: "1.5rem" }}>
              <div className="ts-header" style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>
                刪除評論
              </div>
              <div style={{ marginBottom: "1.5rem", color: "var(--app-muted)" }}>
                確定要刪除這則評論嗎？此操作無法復原。
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={confirmDelete}
                  className="ts-button is-negative"
                  disabled={loading}
                >
                  {loading ? "刪除中..." : "確定刪除"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="ts-button is-outlined"
                  disabled={loading}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar */}
      {snackbar && (
        <Snackbar
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar(null)}
        />
      )}
    </div>
  );
}

function RatingInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: RatingValue;
  onChange: (value: RatingValue) => void;
}) {
  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>{label}</div>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating as RatingValue)}
            className={value === rating ? "ts-button is-primary" : "ts-button is-outlined"}
            style={{ width: "3rem", height: "3rem", fontSize: "1.125rem" }}
          >
            {rating}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ts-button is-ghost"
          style={{ marginLeft: "0.5rem" }}
        >
          N/A
        </button>
      </div>
    </div>
  );
}

function RatingBadge({ label, value }: { label: string; value: number }) {
  const getColor = (val: number) => {
    if (val >= 4) return "var(--ts-positive-500)";
    if (val >= 3) return "var(--ts-warning-500)";
    return "var(--ts-negative-500)";
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.375rem 0.75rem",
        backgroundColor: "var(--app-surface)",
        borderRadius: "6px",
        fontSize: "0.875rem",
      }}
    >
      <span style={{ color: "var(--app-muted)" }}>{label}</span>
      <span style={{ fontWeight: 700, color: getColor(value) }}>{value}</span>
    </div>
  );
}

function VoteButtons({
  reviewId,
  votes,
  isOwnReview,
}: {
  reviewId: string;
  votes: Review["votes"];
  isOwnReview: boolean;
}) {
  const [voteState, setVoteState] = useState(votes);
  const [loading, setLoading] = useState(false);

  const handleVote = async (voteType: "UPVOTE" | "DOWNVOTE") => {
    if (isOwnReview) {
      alert("無法對自己的評論投票");
      return;
    }

    setLoading(true);
    const originalState = voteState;

    try {
      // 若點擊已選的票型，則取消投票
      if (voteState.currentUserVote === voteType) {
        const res = await fetch(`/api/reviews/${reviewId}/vote`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error();

        const data = await res.json();
        setVoteState({ ...data.counts, currentUserVote: null });
      } else {
        // 投票或更改票型
        const res = await fetch(`/api/reviews/${reviewId}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voteType }),
        });
        if (!res.ok) throw new Error();

        const data = await res.json();
        setVoteState({
          ...data.counts,
          currentUserVote: voteType,
        });
      }
    } catch (error) {
      alert("操作失敗，請稍後再試");
      setVoteState(originalState);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
      className="mobile-button-group"
    >
      {/* 讚按鈕 */}
      <button
        onClick={() => handleVote("UPVOTE")}
        disabled={loading || isOwnReview}
        className={`ts-button is-small ${
          voteState.currentUserVote === "UPVOTE" ? "is-primary" : "is-outlined"
        }`}
        style={{ minWidth: "4.5rem" }}
        title={isOwnReview ? "無法對自己的評論投票" : "有幫助"}
      >
        <span style={{ fontSize: "1rem" }}>👍</span>
        <span style={{ marginLeft: "0.25rem" }}>{voteState.upvotes}</span>
      </button>

      {/* 倒讚按鈕 */}
      <button
        onClick={() => handleVote("DOWNVOTE")}
        disabled={loading || isOwnReview}
        className={`ts-button is-small ${
          voteState.currentUserVote === "DOWNVOTE" ? "is-negative" : "is-outlined"
        }`}
        style={{ minWidth: "4.5rem" }}
        title={isOwnReview ? "無法對自己的評論投票" : "沒幫助"}
      >
        <span style={{ fontSize: "1rem" }}>👎</span>
        <span style={{ marginLeft: "0.25rem" }}>{voteState.downvotes}</span>
      </button>
    </div>
  );
}
