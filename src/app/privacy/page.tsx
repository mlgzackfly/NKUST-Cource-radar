import Link from "next/link";

export const metadata = {
  title: "隱私權政策 - 高科選課雷達",
  description: "高科選課雷達隱私權政策與個人資料保護聲明",
};

export default function PrivacyPage() {
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
              隱私權政策
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
                  1. 前言
                </h2>
                <p style={{ marginBottom: "1rem" }}>
                  高科選課雷達（以下簡稱「本服務」）重視您的隱私權。本隱私權政策說明我們如何收集、使用、揭露和保護您的個人資料。
                </p>
                <p>
                  使用本服務即表示您同意本隱私權政策的內容。如果您不同意本政策，請勿使用本服務。
                </p>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  2. 我們收集的資料
                </h2>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                  2.1 帳戶資料
                </h3>
                <ul style={{ marginBottom: "1rem", paddingLeft: "1.5rem" }}>
                  <li>電子郵件地址（僅限 @nkust.edu.tw）</li>
                  <li>登入時間記錄</li>
                </ul>

                <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                  2.2 評論資料
                </h3>
                <ul style={{ marginBottom: "1rem", paddingLeft: "1.5rem" }}>
                  <li>評論內容（包含評分和文字）</li>
                  <li>發布時間與更新時間</li>
                  <li>系所資訊（選擇性提供）</li>
                </ul>

                <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                  2.3 自動收集的資料
                </h3>
                <ul style={{ paddingLeft: "1.5rem" }}>
                  <li>瀏覽器類型和版本</li>
                  <li>裝置資訊</li>
                  <li>IP 位址</li>
                  <li>使用時間和頁面瀏覽記錄</li>
                </ul>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  3. 資料使用方式
                </h2>
                <p style={{ marginBottom: "0.75rem" }}>我們使用收集的資料用於：</p>
                <ul style={{ paddingLeft: "1.5rem" }}>
                  <li>提供和維護本服務</li>
                  <li>驗證用戶身份</li>
                  <li>顯示課程評論</li>
                  <li>改善服務品質和用戶體驗</li>
                  <li>防止濫用和維護服務安全</li>
                  <li>遵守法律義務</li>
                </ul>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  4. 資料保護
                </h2>
                <p style={{ marginBottom: "0.75rem" }}>
                  我們採取合理的技術和組織措施保護您的個人資料：
                </p>
                <ul style={{ paddingLeft: "1.5rem" }}>
                  <li>使用 HTTPS 加密傳輸</li>
                  <li>資料庫存取控制</li>
                  <li>定期安全性審查</li>
                  <li>Session 自動過期機制（7 天）</li>
                </ul>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  5. 匿名性保護
                </h2>
                <p style={{ marginBottom: "0.75rem" }}>本服務重視評論者的匿名性：</p>
                <ul style={{ paddingLeft: "1.5rem" }}>
                  <li>評論一律匿名顯示，不會顯示您的姓名或學號</li>
                  <li>您可以選擇是否顯示系所資訊</li>
                  <li>我們不會將您的評論與您的帳戶公開關聯</li>
                  <li>評論內容僅用於課程資訊參考</li>
                </ul>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  6. 資料分享
                </h2>
                <p style={{ marginBottom: "0.75rem" }}>
                  我們不會出售您的個人資料。我們僅在以下情況分享資料：
                </p>
                <ul style={{ paddingLeft: "1.5rem" }}>
                  <li>經您明確同意</li>
                  <li>遵守法律要求或回應法律程序</li>
                  <li>保護本服務、用戶或公眾的權益、財產或安全</li>
                  <li>與服務提供商（如託管服務）分享必要資料以維持服務運作</li>
                </ul>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  7. Cookie 使用
                </h2>
                <p style={{ marginBottom: "0.75rem" }}>
                  本服務使用 Cookie 和類似技術來維持登入狀態和改善用戶體驗。詳細資訊請參閱我們的{" "}
                  <Link
                    href="/cookies"
                    style={{ color: "var(--ts-primary-600)", textDecoration: "underline" }}
                  >
                    Cookie 使用說明
                  </Link>
                  。
                </p>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  8. 您的權利
                </h2>
                <p style={{ marginBottom: "0.75rem" }}>依據個人資料保護法，您享有以下權利：</p>
                <ul style={{ paddingLeft: "1.5rem" }}>
                  <li>查詢或請求閱覽您的個人資料</li>
                  <li>請求製給複製本</li>
                  <li>請求補充或更正</li>
                  <li>請求停止收集、處理或利用</li>
                  <li>請求刪除</li>
                </ul>
                <p style={{ marginTop: "1rem" }}>
                  您可以隨時編輯或刪除您的評論。如需行使其他權利，請透過登入時使用的電子郵件聯繫我們。
                </p>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  9. 資料保存期限
                </h2>
                <ul style={{ paddingLeft: "1.5rem" }}>
                  <li>帳戶資料：直到您刪除帳戶或超過 180 天未使用</li>
                  <li>評論資料：直到您刪除評論或刪除帳戶</li>
                  <li>Session 資料：最長 7 天</li>
                  <li>系統日誌：最長 90 天</li>
                </ul>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  10. 未成年人
                </h2>
                <p>
                  本服務僅供高雄科技大學在學學生使用。如果您未滿 18
                  歲，請在使用本服務前徵得家長或監護人的同意。
                </p>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  11. 政策變更
                </h2>
                <p>
                  我們可能不時更新本隱私權政策。重大變更將在網站上公告，並更新「最後更新日期」。
                  繼續使用本服務即表示您接受更新後的政策。
                </p>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  12. 聯繫我們
                </h2>
                <p>
                  如果您對本隱私權政策或您的個人資料有任何疑問，請透過您註冊的 @nkust.edu.tw
                  電子郵件聯繫我們。
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
                  <strong>重要提醒：</strong>
                </p>
                <p style={{ fontSize: "0.875rem", color: "var(--ts-gray-600)", lineHeight: 1.6 }}>
                  本服務為非官方的學生自主開發專案，不隸屬於國立高雄科技大學。
                  評論內容僅代表個人意見，不代表學校或本服務立場。
                  請尊重他人、理性評論，共同維護良好的社群環境。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
