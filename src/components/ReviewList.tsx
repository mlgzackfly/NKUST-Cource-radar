"use client";

import { useUser, SignInButton } from "@clerk/nextjs";

type Review = {
  id: string;
  createdAt: string;
  coolness: number | null;
  usefulness: number | null;
  workload: number | null;
  attendance: number | null;
  body: string | null;
  authorDept: string | null;
};

export function ReviewList({ reviews }: { reviews: Review[] | null }) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="ts-box is-raised">
        <div className="ts-content" style={{ padding: "3rem 2rem", textAlign: "center" }}>
          <div className="app-muted">載入中...</div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="ts-box is-raised">
        <div className="ts-content" style={{ padding: "3rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
          <div className="ts-header" style={{ marginBottom: "1rem" }}>登入查看評論</div>
          <div className="app-muted" style={{ marginBottom: "1.5rem" }}>
            為了保護評論者隱私，需要登入後才能查看完整評論內容
          </div>
          <SignInButton mode="modal">
            <button className="ts-button is-primary">
              登入查看
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="ts-box is-raised">
        <div className="ts-content" style={{ padding: "3rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📝</div>
          <div className="ts-header" style={{ marginBottom: "0.5rem" }}>尚無評論</div>
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
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  return (
    <div className="ts-box is-raised">
      <div className="ts-content" style={{ padding: "1.5rem" }}>
        {/* Header */}
        <div style={{ fontSize: "0.875rem", color: "var(--app-muted)", marginBottom: "1rem" }}>
          {review.authorDept || "匿名使用者"} · {formatDate(review.createdAt)}
        </div>

        {/* Ratings */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {review.coolness !== null && (
            <RatingBadge label="涼度" value={review.coolness} />
          )}
          {review.usefulness !== null && (
            <RatingBadge label="實用" value={review.usefulness} />
          )}
          {review.workload !== null && (
            <RatingBadge label="作業量" value={review.workload} />
          )}
          {review.attendance !== null && (
            <RatingBadge label="點名" value={review.attendance} />
          )}
        </div>

        {/* Body */}
        {review.body && (
          <div style={{
            padding: "1rem",
            backgroundColor: "var(--app-surface)",
            borderRadius: "8px",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap"
          }}>
            {review.body}
          </div>
        )}
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
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.375rem 0.75rem",
      backgroundColor: "var(--app-surface)",
      borderRadius: "6px",
      fontSize: "0.875rem"
    }}>
      <span style={{ color: "var(--app-muted)" }}>{label}</span>
      <span style={{ fontWeight: 700, color: getColor(value) }}>{value}</span>
    </div>
  );
}
