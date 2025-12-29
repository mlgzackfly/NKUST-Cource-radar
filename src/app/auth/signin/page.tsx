"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

function SignInForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.toLowerCase().endsWith("@nkust.edu.tw")) {
      setError("請使用 @nkust.edu.tw 信箱");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 統一將 email 本地部分轉為大寫（如 c109193108@nkust.edu.tw -> C109193108@nkust.edu.tw）
      const [localPart, domain] = email.split("@");
      const normalizedEmail = `${localPart.toUpperCase()}@${domain.toLowerCase()}`;

      const result = await signIn("email", {
        email: normalizedEmail,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError("登入失敗，請稍後再試");
      } else {
        window.location.href = `/auth/verify-request?email=${encodeURIComponent(normalizedEmail)}`;
      }
    } catch (err) {
      setError("發生錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
      <div style={{ maxWidth: "440px", margin: "0 auto" }}>
        <div className="ts-box is-raised" style={{ borderRadius: "16px" }}>
          <div className="ts-content" style={{ padding: "2.5rem" }}>
            <Link
              href="/"
              className="ts-button is-ghost is-short"
              style={{ marginBottom: "1.5rem" }}
            >
              ← 回首頁
            </Link>

            <div
              className="ts-header"
              style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1rem" }}
            >
              登入
            </div>

            <div className="app-muted" style={{ marginBottom: "2rem", lineHeight: 1.6 }}>
              使用 <strong>@nkust.edu.tw</strong> 信箱登入，我們會寄送登入連結到您的信箱。
            </div>

            <form onSubmit={handleSubmit}>
              <div className="ts-control is-stacked" style={{ marginBottom: "1.5rem" }}>
                <div className="label">電子郵件</div>
                <div className="content">
                  <div className="ts-input is-fluid">
                    <input
                      type="email"
                      placeholder="your-email@nkust.edu.tw"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="ts-notice is-negative" style={{ marginBottom: "1.5rem" }}>
                  <div className="content">{error}</div>
                </div>
              )}

              <button type="submit" className="ts-button is-primary is-fluid" disabled={loading}>
                {loading ? "傳送中..." : "傳送登入連結"}
              </button>

              <div
                style={{
                  marginTop: "1rem",
                  fontSize: "0.8125rem",
                  color: "var(--ts-gray-600)",
                  lineHeight: 1.6,
                  textAlign: "center",
                }}
              >
                繼續即表示您同意我們的{" "}
                <Link
                  href="/privacy"
                  style={{ color: "var(--ts-primary-600)", textDecoration: "underline" }}
                >
                  隱私權政策
                </Link>{" "}
                和{" "}
                <Link
                  href="/cookies"
                  style={{ color: "var(--ts-primary-600)", textDecoration: "underline" }}
                >
                  Cookie 使用說明
                </Link>
              </div>
            </form>

            <div className="ts-notice is-outlined" style={{ marginTop: "1.5rem" }}>
              <div className="content" style={{ fontSize: "0.875rem" }}>
                校友若無法使用 @nkust.edu.tw 信箱，暫時無法撰寫評論。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense
      fallback={
        <div className="app-container" style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
          <div style={{ maxWidth: "440px", margin: "0 auto", textAlign: "center" }}>載入中...</div>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
