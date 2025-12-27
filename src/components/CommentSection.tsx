"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  isOwnComment: boolean;
  authorDept: string | null;
};

type CommentSectionProps = {
  reviewId: string;
};

export default function CommentSection({ reviewId }: CommentSectionProps) {
  const { data: session, status } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [newCommentBody, setNewCommentBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 載入留言
  const loadComments = async (limit?: number) => {
    try {
      setLoading(true);
      const url = new URL(`/api/reviews/${reviewId}/comments`, window.location.origin);
      if (limit) url.searchParams.set("limit", String(limit));

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "載入留言失敗");
      }

      setComments(data.comments);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error("Error loading comments:", err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 初始載入（顯示前 3 則）
  useEffect(() => {
    if (status === "authenticated") {
      loadComments(3);
    }
  }, [reviewId, status]);

  // 新增留言
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCommentBody.trim()) {
      alert("留言內容不可為空");
      return;
    }

    if (!session) {
      alert("需要登入才能留言");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`/api/reviews/${reviewId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: newCommentBody }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "新增留言失敗");
      }

      // 成功後清空輸入框並重新載入留言
      setNewCommentBody("");
      await loadComments(showAll ? undefined : 3);
    } catch (err) {
      console.error("Error submitting comment:", err);
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // 刪除留言
  const handleDelete = async (commentId: string) => {
    if (!confirm("確定要刪除此留言嗎？")) {
      return;
    }

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "刪除留言失敗");
      }

      // 成功後重新載入留言
      await loadComments(showAll ? undefined : 3);
    } catch (err) {
      console.error("Error deleting comment:", err);
      alert((err as Error).message);
    }
  };

  // 展開所有留言
  const handleShowAll = () => {
    setShowAll(true);
    loadComments();
  };

  // 未登入時不顯示留言區塊
  if (status === "unauthenticated") {
    return (
      <div
        className="ts-box"
        style={{
          padding: "1rem",
          marginTop: "1rem",
          backgroundColor: "var(--app-surface)",
          borderRadius: "8px",
        }}
      >
        <div style={{ textAlign: "center", color: "var(--app-muted)" }}>
          登入後即可查看與發表留言
        </div>
      </div>
    );
  }

  return (
    <div
      className="ts-box"
      style={{
        padding: "1.5rem",
        marginTop: "1rem",
        backgroundColor: "var(--app-surface)",
        borderRadius: "8px",
      }}
    >
      <div
        style={{
          fontSize: "0.875rem",
          fontWeight: 600,
          marginBottom: "1rem",
          color: "var(--app-text)",
        }}
      >
        留言 {total > 0 && `(${total})`}
      </div>

      {/* 載入中 */}
      {loading && comments.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--app-muted)", padding: "1rem" }}>
          載入中...
        </div>
      )}

      {/* 錯誤訊息 */}
      {error && (
        <div
          className="ts-notice is-negative"
          style={{ marginBottom: "1rem" }}
        >
          {error}
        </div>
      )}

      {/* 留言列表 */}
      {!loading && comments.length === 0 && (
        <div
          style={{
            textAlign: "center",
            color: "var(--app-muted)",
            padding: "1rem",
          }}
        >
          目前還沒有留言
        </div>
      )}

      {comments.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          {comments.map((comment) => (
            <div
              key={comment.id}
              style={{
                padding: "0.75rem",
                marginBottom: "0.75rem",
                backgroundColor: "var(--app-bg)",
                borderRadius: "6px",
                border: "1px solid var(--app-border)",
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
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--app-muted)",
                  }}
                >
                  {comment.authorDept || "匿名使用者"} ·{" "}
                  {new Date(comment.createdAt).toLocaleDateString("zh-TW")}
                </div>
                {comment.isOwnComment && (
                  <button
                    className="ts-button is-small is-ghost"
                    onClick={() => handleDelete(comment.id)}
                    style={{
                      padding: "0.25rem 0.5rem",
                      fontSize: "0.75rem",
                      color: "var(--ts-negative-500)",
                    }}
                  >
                    刪除
                  </button>
                )}
              </div>
              <div
                style={{
                  fontSize: "0.875rem",
                  color: "var(--app-text)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {comment.body}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 顯示更多按鈕 */}
      {!showAll && hasMore && (
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <button
            className="ts-button is-small is-outlined"
            onClick={handleShowAll}
            disabled={loading}
          >
            {loading ? "載入中..." : `顯示全部 ${total} 則留言`}
          </button>
        </div>
      )}

      {/* 新增留言表單 */}
      {session && (
        <form onSubmit={handleSubmit}>
          <div className="ts-control is-fluid" style={{ marginBottom: "0.75rem" }}>
            <textarea
              className="ts-input"
              placeholder="輸入你的留言..."
              rows={3}
              value={newCommentBody}
              onChange={(e) => setNewCommentBody(e.target.value)}
              disabled={submitting}
              maxLength={500}
              style={{
                resize: "vertical",
                minHeight: "80px",
              }}
            />
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--app-muted)",
                marginTop: "0.25rem",
                textAlign: "right",
              }}
            >
              {newCommentBody.length}/500
            </div>
          </div>
          <button
            type="submit"
            className="ts-button is-primary is-small"
            disabled={submitting || !newCommentBody.trim()}
          >
            {submitting ? "發送中..." : "發送留言"}
          </button>
        </form>
      )}
    </div>
  );
}
