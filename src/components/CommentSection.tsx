"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  isOwnComment: boolean;
  authorDept: string | null;
}

interface CommentSectionProps {
  reviewId: string;
  initialCommentCount?: number;
}

export function CommentSection({ reviewId, initialCommentCount = 0 }: CommentSectionProps) {
  const { data: session, status } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(initialCommentCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const fetchComments = useCallback(async () => {
    if (status !== "authenticated") return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/reviews/${reviewId}/comments`);
      if (!res.ok) {
        if (res.status === 401) {
          setError("請先登入才能查看留言");
          return;
        }
        throw new Error("Failed to fetch comments");
      }

      const data = await res.json();
      setComments(data.comments);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (err) {
      setError("載入留言失敗");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [reviewId, status]);

  useEffect(() => {
    if (isExpanded && comments.length === 0 && !loading) {
      fetchComments();
    }
  }, [isExpanded, comments.length, loading, fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/reviews/${reviewId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newComment.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to post comment");
      }

      setNewComment("");
      // 重新載入留言
      await fetchComments();
    } catch (err: any) {
      setError(err.message || "發送留言失敗");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("確定要刪除這則留言嗎？")) return;

    try {
      const res = await fetch(`/api/reviews/${reviewId}/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete comment");
      }

      // 從列表中移除
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setTotal((prev) => prev - 1);
    } catch (err) {
      setError("刪除留言失敗");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 未登入時顯示提示
  if (status === "unauthenticated") {
    return (
      <div style={{ marginTop: "1rem" }}>
        <button
          type="button"
          className="ts-button is-ghost is-small"
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ color: "var(--ts-gray-500)" }}
        >
          <span style={{ marginRight: "0.5rem" }}>💬</span>
          留言 ({initialCommentCount})
        </button>
        {isExpanded && (
          <div
            className="ts-box is-hollowed"
            style={{ marginTop: "0.75rem", padding: "1rem", textAlign: "center" }}
          >
            <p style={{ color: "var(--ts-gray-500)", marginBottom: "0.5rem" }}>
              登入後即可查看與發送留言
            </p>
            <a href="/auth/signin" className="ts-button is-small is-outlined">
              登入
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      {/* 展開/收合按鈕 */}
      <button
        type="button"
        className="ts-button is-ghost is-small"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ color: "var(--ts-gray-500)" }}
      >
        <span style={{ marginRight: "0.5rem" }}>💬</span>
        留言 ({total})
        <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem" }}>{isExpanded ? "▲" : "▼"}</span>
      </button>

      {isExpanded && (
        <div style={{ marginTop: "0.75rem" }}>
          {/* 錯誤訊息 */}
          {error && (
            <div className="ts-notice is-negative is-small" style={{ marginBottom: "0.75rem" }}>
              {error}
            </div>
          )}

          {/* 留言輸入框 */}
          {status === "authenticated" && (
            <form onSubmit={handleSubmit} style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  className="ts-input"
                  placeholder="寫一則留言..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  maxLength={500}
                  disabled={submitting}
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  className="ts-button is-primary"
                  disabled={!newComment.trim() || submitting}
                >
                  {submitting ? "..." : "送出"}
                </button>
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--ts-gray-400)",
                  marginTop: "0.25rem",
                  textAlign: "right",
                }}
              >
                {newComment.length}/500
              </div>
            </form>
          )}

          {/* 留言列表 */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "1rem", color: "var(--ts-gray-500)" }}>
              載入中...
            </div>
          ) : comments.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "1rem",
                color: "var(--ts-gray-400)",
                fontSize: "0.875rem",
              }}
            >
              尚無留言，成為第一個留言的人吧！
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="ts-box is-hollowed"
                  style={{
                    padding: "0.75rem 1rem",
                    backgroundColor: comment.isOwnComment
                      ? "color-mix(in srgb, var(--ts-primary-500) 5%, transparent)"
                      : undefined,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", color: "var(--ts-gray-500)" }}>
                      <span style={{ fontWeight: 500 }}>
                        {comment.isOwnComment ? "你" : comment.authorDept || "匿名"}
                      </span>
                      <span style={{ margin: "0 0.5rem" }}>·</span>
                      <span>{formatDate(comment.createdAt)}</span>
                    </div>
                    {comment.isOwnComment && (
                      <button
                        type="button"
                        className="ts-button is-ghost is-small is-negative"
                        onClick={() => handleDelete(comment.id)}
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                      >
                        刪除
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: "0.9375rem", lineHeight: 1.6 }}>{comment.body}</div>
                </div>
              ))}

              {hasMore && (
                <button
                  type="button"
                  className="ts-button is-ghost is-small"
                  onClick={() => {
                    // TODO: 實作載入更多
                  }}
                  style={{ alignSelf: "center" }}
                >
                  載入更多...
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
