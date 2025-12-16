"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return "伺服器配置錯誤";
      case "Verification":
        return "登入連結已過期或無效";
      case "AccessDenied":
        return "存取被拒絕";
      default:
        return "登入時發生錯誤";
    }
  };

  return (
    <div className="app-container" style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
      <div style={{ maxWidth: "440px", margin: "0 auto" }}>
        <div className="ts-box is-raised" style={{ borderRadius: "16px" }}>
          <div className="ts-content" style={{ padding: "2.5rem", textAlign: "center" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>⚠️</div>

            <div className="ts-header" style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1rem" }}>
              登入失敗
            </div>

            <div className="ts-notice is-negative" style={{ marginBottom: "1.5rem" }}>
              <div className="content">{getErrorMessage(error)}</div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <Link href="/auth/signin" className="ts-button is-primary">
                重新登入
              </Link>
              <Link href="/" className="ts-button is-outlined">
                回首頁
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
