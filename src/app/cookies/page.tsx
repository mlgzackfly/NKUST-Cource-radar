import Link from "next/link";

export const metadata = {
  title: "Cookie 使用說明 - 高科選課雷達",
  description: "高科選課雷達 Cookie 與追蹤技術使用說明",
};

export default function CookiesPage() {
  return (
    <div className="app-container" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div className="ts-box is-raised">
          <div className="ts-content" style={{ padding: "3rem" }}>
            <Link
              href="/"
              className="ts-button is-ghost is-short"
              style={{ marginBottom: "1.5rem" }}
            >
              ← 回首頁
            </Link>

            <h1 style={{ fontSize: "2.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>
              Cookie 使用說明
            </h1>
            <p className="app-muted" style={{ marginBottom: "2rem", fontSize: "0.9375rem" }}>
              最後更新日期：
              {new Date().toLocaleDateString("zh-TW", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>

            <div style={{ lineHeight: 1.8, fontSize: "1rem" }}>
              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  1. 什麼是 Cookie？
                </h2>
                <p>
                  Cookie 是網站在您的裝置上儲存的小型文字檔案。Cookie 讓網站能夠記住您的偏好設定、
                  維持登入狀態，並提供更好的使用體驗。
                </p>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  2. 我們使用的 Cookie
                </h2>

                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    marginBottom: "1rem",
                    marginTop: "1.5rem",
                  }}
                >
                  2.1 必要 Cookie（無法停用）
                </h3>
                <div
                  style={{
                    background: "var(--ts-gray-50)",
                    padding: "1.5rem",
                    borderRadius: "8px",
                    marginBottom: "1.5rem",
                  }}
                >
                  <table style={{ width: "100%", fontSize: "0.9375rem" }}>
                    <tbody>
                      <tr>
                        <td style={{ paddingBottom: "0.75rem", fontWeight: 600, width: "30%" }}>
                          Cookie 名稱
                        </td>
                        <td style={{ paddingBottom: "0.75rem" }}>next-auth.session-token</td>
                      </tr>
                      <tr>
                        <td style={{ paddingBottom: "0.75rem", fontWeight: 600 }}>用途</td>
                        <td style={{ paddingBottom: "0.75rem" }}>維持您的登入狀態</td>
                      </tr>
                      <tr>
                        <td style={{ paddingBottom: "0.75rem", fontWeight: 600 }}>有效期限</td>
                        <td style={{ paddingBottom: "0.75rem" }}>最長 7 天</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>類型</td>
                        <td>第一方 Cookie（由本網站設定）</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    background: "var(--ts-gray-50)",
                    padding: "1.5rem",
                    borderRadius: "8px",
                    marginBottom: "1.5rem",
                  }}
                >
                  <table style={{ width: "100%", fontSize: "0.9375rem" }}>
                    <tbody>
                      <tr>
                        <td style={{ paddingBottom: "0.75rem", fontWeight: 600, width: "30%" }}>
                          Cookie 名稱
                        </td>
                        <td style={{ paddingBottom: "0.75rem" }}>next-auth.csrf-token</td>
                      </tr>
                      <tr>
                        <td style={{ paddingBottom: "0.75rem", fontWeight: 600 }}>用途</td>
                        <td style={{ paddingBottom: "0.75rem" }}>防止跨站請求偽造攻擊（CSRF）</td>
                      </tr>
                      <tr>
                        <td style={{ paddingBottom: "0.75rem", fontWeight: 600 }}>有效期限</td>
                        <td style={{ paddingBottom: "0.75rem" }}>Session（瀏覽器關閉即失效）</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>類型</td>
                        <td>第一方 Cookie</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    background: "var(--ts-gray-50)",
                    padding: "1.5rem",
                    borderRadius: "8px",
                  }}
                >
                  <table style={{ width: "100%", fontSize: "0.9375rem" }}>
                    <tbody>
                      <tr>
                        <td style={{ paddingBottom: "0.75rem", fontWeight: 600, width: "30%" }}>
                          Cookie 名稱
                        </td>
                        <td style={{ paddingBottom: "0.75rem" }}>next-auth.callback-url</td>
                      </tr>
                      <tr>
                        <td style={{ paddingBottom: "0.75rem", fontWeight: 600 }}>用途</td>
                        <td style={{ paddingBottom: "0.75rem" }}>記錄登入後要返回的頁面</td>
                      </tr>
                      <tr>
                        <td style={{ paddingBottom: "0.75rem", fontWeight: 600 }}>有效期限</td>
                        <td style={{ paddingBottom: "0.75rem" }}>Session</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>類型</td>
                        <td>第一方 Cookie</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    marginBottom: "1rem",
                    marginTop: "2rem",
                  }}
                >
                  2.2 功能性 Cookie
                </h3>
                <p style={{ marginBottom: "1rem" }}>
                  目前本服務不使用額外的功能性 Cookie。未來如有需要將在此更新說明。
                </p>

                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    marginBottom: "1rem",
                    marginTop: "2rem",
                  }}
                >
                  2.3 分析 Cookie
                </h3>
                <p style={{ marginBottom: "1rem" }}>
                  目前本服務不使用分析工具（如 Google
                  Analytics）。我們不會追蹤您的瀏覽行為用於分析或廣告目的。
                </p>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  3. 第三方 Cookie
                </h2>
                <p>本服務目前不使用第三方 Cookie。我們不與廣告商或數據分析公司分享 Cookie 資料。</p>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  4. 如何管理 Cookie
                </h2>
                <p style={{ marginBottom: "1rem" }}>
                  大部分瀏覽器預設會自動接受 Cookie，但您可以修改設定來拒絕或刪除 Cookie：
                </p>

                <div
                  style={{
                    background: "var(--ts-gray-50)",
                    padding: "1.5rem",
                    borderRadius: "8px",
                    marginBottom: "1rem",
                  }}
                >
                  <h4 style={{ fontWeight: 600, marginBottom: "0.75rem" }}>
                    瀏覽器 Cookie 設定指南：
                  </h4>
                  <ul style={{ paddingLeft: "1.5rem", marginBottom: 0 }}>
                    <li style={{ marginBottom: "0.5rem" }}>
                      <strong>Chrome：</strong> 設定 → 隱私權和安全性 → Cookie 和其他網站資料
                    </li>
                    <li style={{ marginBottom: "0.5rem" }}>
                      <strong>Firefox：</strong> 設定 → 隱私權與安全性 → Cookie 與網站資料
                    </li>
                    <li style={{ marginBottom: "0.5rem" }}>
                      <strong>Safari：</strong> 偏好設定 → 隱私權
                    </li>
                    <li>
                      <strong>Edge：</strong> 設定 → Cookie 和網站權限
                    </li>
                  </ul>
                </div>

                <div className="ts-notice is-warning is-outlined" style={{ marginTop: "1.5rem" }}>
                  <div className="title">重要提醒</div>
                  <div className="content">
                    如果您停用必要 Cookie，將無法正常使用本服務的登入功能。
                  </div>
                </div>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  5. 登出時的處理
                </h2>
                <p>當您登出時，我們會：</p>
                <ul style={{ paddingLeft: "1.5rem" }}>
                  <li>刪除您的 session Cookie</li>
                  <li>從資料庫中移除 session 記錄</li>
                  <li>清除瀏覽器的認證狀態</li>
                </ul>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  6. Cookie 政策變更
                </h2>
                <p>
                  我們可能不時更新本 Cookie
                  使用說明。如有重大變更，我們會更新「最後更新日期」並在網站上公告。
                </p>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  7. 更多資訊
                </h2>
                <p>
                  如需了解我們如何處理您的個人資料，請參閱我們的{" "}
                  <Link
                    href="/privacy"
                    style={{ color: "var(--ts-primary-600)", textDecoration: "underline" }}
                  >
                    隱私權政策
                  </Link>
                  。
                </p>
              </section>

              <div
                style={{
                  padding: "1.5rem",
                  background: "var(--ts-gray-50)",
                  borderRadius: "8px",
                  marginTop: "2rem",
                }}
              >
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--ts-gray-600)",
                    marginBottom: "0.5rem",
                  }}
                >
                  <strong>簡單來說：</strong>
                </p>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--ts-gray-600)",
                    lineHeight: 1.6,
                    marginBottom: 0,
                  }}
                >
                  我們只使用必要的 Cookie 來維持您的登入狀態和保護您的安全。
                  我們不會追蹤您的瀏覽行為，也不會將您的資料用於廣告或行銷目的。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
