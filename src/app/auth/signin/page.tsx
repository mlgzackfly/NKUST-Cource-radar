"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

function SignInForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const errorParam = searchParams.get("error");

  // 處理 URL 中的錯誤參數
  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "AccessDenied":
        return "只允許使用 @nkust.edu.tw 帳號登入";
      case "OAuthAccountNotLinked":
        return "此帳號已使用其他方式登入過";
      default:
        return null;
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      await signIn("google", {
        callbackUrl,
      });
    } catch {
      setError("登入失敗，請稍後再試");
      setLoading(false);
    }
  };

  const displayError = error || getErrorMessage(errorParam);

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
              使用高科大 Google 帳號（<strong>@nkust.edu.tw</strong>）快速登入。
            </div>

            {displayError && (
              <div className="ts-notice is-negative" style={{ marginBottom: "1.5rem" }}>
                <div className="content">{displayError}</div>
              </div>
            )}

            <button
              type="button"
              className="ts-button is-fluid is-outlined"
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
                padding: "0.875rem 1.5rem",
                fontSize: "1rem",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {loading ? "登入中..." : "使用 Google 帳號登入"}
            </button>

            <div
              style={{
                marginTop: "1.5rem",
                fontSize: "0.8125rem",
                color: "var(--ts-gray-600)",
                lineHeight: 1.6,
                textAlign: "center",
              }}
            >
              繼續即表示您同意我們的{" "}
              <Link
                href="/terms"
                style={{ color: "var(--ts-primary-600)", textDecoration: "underline" }}
              >
                服務條款
              </Link>
              、
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

            <div className="ts-notice is-outlined" style={{ marginTop: "1.5rem" }}>
              <div className="content" style={{ fontSize: "0.875rem" }}>
                僅限高科大師生使用 @nkust.edu.tw 帳號登入。
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
