"use client";

import { useState } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

type RatingValue = 1 | 2 | 3 | 4 | 5 | null;

export function ReviewForm({ courseId }: { courseId: string }) {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  const [coolness, setCoolness] = useState<RatingValue>(null);
  const [usefulness, setUsefulness] = useState<RatingValue>(null);
  const [workload, setWorkload] = useState<RatingValue>(null);
  const [attendance, setAttendance] = useState<RatingValue>(null);
  const [body, setBody] = useState("");
  const [authorDept, setAuthorDept] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isLoaded) {
    return (
      <div className="ts-box is-raised">
        <div className="ts-content" style={{ padding: "2rem", textAlign: "center" }}>
          <div className="ts-header" style={{ marginBottom: "1rem" }}>撰寫課程評價</div>
          <div className="app-muted">載入中...</div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="ts-box is-raised">
        <div className="ts-content" style={{ padding: "2rem", textAlign: "center" }}>
          <div className="ts-header" style={{ marginBottom: "1rem" }}>撰寫課程評價</div>
          <div className="app-muted" style={{ marginBottom: "1.5rem" }}>
            登入後即可撰寫評價
          </div>
          <SignInButton mode="modal">
            <button className="ts-button is-primary">
              登入撰寫
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!coolness && !usefulness && !workload && !attendance) {
      setError("至少需要填寫一項評分");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          coolness,
          usefulness,
          workload,
          attendance,
          body: body.trim() || null,
          authorDept: authorDept.trim() || null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "提交失敗");
      }

      setSuccess(true);
      setTimeout(() => {
        router.refresh();
      }, 1500);

    } catch (err: any) {
      setError(err.message || "提交失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="ts-box is-raised">
        <div className="ts-content" style={{ padding: "2rem" }}>
          <div className="ts-notice is-positive">
            <div className="title">評價已送出</div>
            <div className="content">感謝您的分享！</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ts-box is-raised">
      <div className="ts-content" style={{ padding: "2rem" }}>
        <div className="ts-header" style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>
          撰寫課程評價
        </div>

        <form onSubmit={handleSubmit}>
          {/* Rating Dimensions */}
          <div style={{ display: "grid", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <RatingInput
              label="涼度"
              description="課程輕鬆程度 (5 = 很涼，1 = 很硬)"
              value={coolness}
              onChange={setCoolness}
            />
            <RatingInput
              label="實用性"
              description="課程內容實用程度 (5 = 很實用，1 = 不實用)"
              value={usefulness}
              onChange={setUsefulness}
            />
            <RatingInput
              label="作業量"
              description="作業負擔程度 (5 = 很多，1 = 很少)"
              value={workload}
              onChange={setWorkload}
            />
            <RatingInput
              label="點名"
              description="點名頻率 (5 = 每堂點，1 = 不點名)"
              value={attendance}
              onChange={setAttendance}
            />
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
              <div style={{ fontSize: "0.875rem", color: "var(--app-muted)", marginTop: "0.5rem" }}>
                {body.length} / 2000 字
              </div>
            </div>
          </div>

          {/* Author Department */}
          <div className="ts-control is-stacked" style={{ marginBottom: "1.5rem" }}>
            <div className="label">您的系所 (選填，匿名顯示)</div>
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

          {/* Submit */}
          <button
            type="submit"
            className="ts-button is-primary is-fluid"
            disabled={loading}
          >
            {loading ? "送出中..." : "送出評價"}
          </button>

          {/* Notice */}
          <div className="ts-notice is-outlined" style={{ marginTop: "1rem" }}>
            <div className="content" style={{ fontSize: "0.875rem" }}>
              • 評價會匿名顯示<br />
              • 每門課程只能評價一次<br />
              • 請尊重他人，避免不當言論
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Rating Input Component
function RatingInput({
  label,
  description,
  value,
  onChange
}: {
  label: string;
  description: string;
  value: RatingValue;
  onChange: (value: RatingValue) => void;
}) {
  return (
    <div>
      <div style={{ marginBottom: "0.5rem" }}>
        <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{label}</div>
        <div style={{ fontSize: "0.875rem", color: "var(--app-muted)" }}>
          {description}
        </div>
      </div>
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
