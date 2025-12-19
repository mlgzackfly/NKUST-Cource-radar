"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

export const dynamic = 'force-dynamic';

function VerifyContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="app-container" style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
      <div style={{ maxWidth: "440px", margin: "0 auto" }}>
        <div className="ts-box is-raised" style={{ borderRadius: "16px" }}>
          <div className="ts-content" style={{ padding: "2.5rem", textAlign: "center" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>📧</div>

            <div className="ts-header" style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1rem" }}>
              檢查您的信箱
            </div>

            <div className="app-muted" style={{ marginBottom: "2rem", lineHeight: 1.7 }}>
              {email ? (
                <>
                  登入連結已寄送至<br />
                  <strong>{email}</strong>
                </>
              ) : (
                "登入連結已寄送至您的信箱"
              )}
            </div>

            <div className="ts-notice is-outlined">
              <div className="content" style={{ fontSize: "0.875rem", lineHeight: 1.6, textAlign: "left" }}>
                • 請在 24 小時內點擊連結完成登入<br />
                • 如果沒有收到郵件，請檢查垃圾郵件資料夾<br />
                • 可以關閉此頁面，從郵件中的連結登入
              </div>
            </div>

            <Link href="/" className="ts-button is-outlined" style={{ marginTop: "1.5rem" }}>
              回首頁
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyRequest() {
  return (
    <Suspense fallback={
      <div className="app-container" style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
        <div style={{ maxWidth: "440px", margin: "0 auto", textAlign: "center" }}>
          載入中...
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
