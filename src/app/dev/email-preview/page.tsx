// 開發用：郵件模板預覽頁面
// 只在開發環境可用

import { redirect } from "next/navigation";

export default function EmailPreviewPage() {
  // 只在開發環境可用
  if (process.env.NODE_ENV === "production") {
    redirect("/");
  }

  const mockUrl = "https://nkust.zeabur.app/api/auth/callback/email?token=example-token-12345";

  const emailHtml = `
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans TC', sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <div style="font-size: 28px; margin-bottom: 8px;">📡</div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #18181b;">高科選課雷達</h1>
              <p style="margin: 4px 0 0; font-size: 14px; color: #71717a;">選課，不只是憑感覺</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #18181b;">驗證您的登入請求</h2>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                您正在嘗試登入高科選課雷達。點擊下方按鈕完成驗證：
              </p>

              <!-- Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${mockUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                      確認登入
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <div style="padding: 16px; background-color: #fafafa; border-radius: 10px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0; font-size: 13px; color: #52525b; line-height: 1.5;">
                  <strong style="color: #18181b;">安全提醒</strong><br>
                  此連結將在 24 小時後失效，且只能使用一次。<br>
                  如果這不是您本人的操作，請忽略此郵件。
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; border-radius: 0 0 16px 16px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #71717a; text-align: center;">
                此郵件由系統自動發送，請勿直接回覆。
              </p>
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                © ${new Date().getFullYear()} 高科選課雷達 ·
                <a href="https://nkust.zeabur.app" style="color: #3b82f6; text-decoration: none;">nkust.zeabur.app</a>
              </p>
            </td>
          </tr>
        </table>

        <!-- Sub-footer -->
        <p style="margin: 24px 0 0; font-size: 11px; color: #a1a1aa; text-align: center;">
          如果按鈕無法點擊，請複製以下連結到瀏覽器：<br>
          <a href="${mockUrl}" style="color: #71717a; word-break: break-all;">${mockUrl}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return (
    <div className="app-container" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
      <div className="ts-box is-raised" style={{ marginBottom: "1.5rem" }}>
        <div className="ts-content">
          <div className="ts-header is-large" style={{ marginBottom: "0.5rem" }}>
            郵件模板預覽
          </div>
          <p className="app-muted">
            此頁面僅供開發環境使用，用於預覽登入郵件的樣式。
          </p>
        </div>
      </div>

      {/* Desktop Preview */}
      <div className="ts-box is-raised" style={{ marginBottom: "1.5rem" }}>
        <div className="ts-content" style={{ padding: "1rem" }}>
          <div style={{ marginBottom: "1rem", fontWeight: 600 }}>桌面版預覽</div>
          <div
            style={{
              border: "1px solid var(--app-border)",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <iframe
              srcDoc={emailHtml}
              style={{
                width: "100%",
                height: "700px",
                border: "none",
                background: "#f4f4f5",
              }}
              title="Email Preview Desktop"
            />
          </div>
        </div>
      </div>

      {/* Mobile Preview */}
      <div className="ts-box is-raised">
        <div className="ts-content" style={{ padding: "1rem" }}>
          <div style={{ marginBottom: "1rem", fontWeight: 600 }}>手機版預覽 (375px)</div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "375px",
                border: "1px solid var(--app-border)",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <iframe
                srcDoc={emailHtml}
                style={{
                  width: "100%",
                  height: "700px",
                  border: "none",
                  background: "#f4f4f5",
                }}
                title="Email Preview Mobile"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
