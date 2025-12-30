import Link from "next/link";

export const metadata = {
  title: "服務條款 - 高科選課雷達",
  description: "高科選課雷達服務條款與使用規範",
};

export default function TermsPage() {
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
              服務條款
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
                  1. 服務說明
                </h2>
                <p style={{ marginBottom: "1rem" }}>
                  高科選課雷達（以下簡稱「本服務」）是一個提供國立高雄科技大學課程查詢與匿名評價的非官方平台。本服務旨在幫助學生獲取課程資訊、分享學習經驗，以做出更好的選課決策。
                </p>
                <p>
                  本服務由學生自主開發維護，與國立高雄科技大學校方無直接關聯。
                </p>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  2. 使用資格
                </h2>
                <p style={{ marginBottom: "1rem" }}>使用本服務，您必須：</p>
                <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem" }}>
                  <li style={{ marginBottom: "0.5rem" }}>
                    擁有有效的 @nkust.edu.tw 電子郵件帳號
                  </li>
                  <li style={{ marginBottom: "0.5rem" }}>
                    為國立高雄科技大學的在校學生、教職員或校友
                  </li>
                  <li style={{ marginBottom: "0.5rem" }}>
                    同意遵守本服務條款及相關規範
                  </li>
                </ul>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  3. 使用者行為規範
                </h2>
                <p style={{ marginBottom: "1rem" }}>使用本服務時，您同意不會：</p>
                <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem" }}>
                  <li style={{ marginBottom: "0.5rem" }}>
                    發布不實、誹謗、侮辱或惡意攻擊他人的內容
                  </li>
                  <li style={{ marginBottom: "0.5rem" }}>
                    洩露個人隱私資訊或未經授權的機密資料
                  </li>
                  <li style={{ marginBottom: "0.5rem" }}>
                    發布與課程評價無關的廣告或垃圾訊息
                  </li>
                  <li style={{ marginBottom: "0.5rem" }}>
                    企圖破壞、干擾或非法存取本服務系統
                  </li>
                  <li style={{ marginBottom: "0.5rem" }}>
                    使用自動化工具大量擷取或濫用本服務
                  </li>
                  <li style={{ marginBottom: "0.5rem" }}>
                    從事任何違反中華民國法律的行為
                  </li>
                </ul>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  4. 評論內容規範
                </h2>
                <p style={{ marginBottom: "1rem" }}>發布課程評論時，請遵守以下原則：</p>
                <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem" }}>
                  <li style={{ marginBottom: "0.5rem" }}>
                    <strong>真實性</strong>：評論應基於您的實際修課經驗
                  </li>
                  <li style={{ marginBottom: "0.5rem" }}>
                    <strong>建設性</strong>：提供對其他學生有幫助的資訊
                  </li>
                  <li style={{ marginBottom: "0.5rem" }}>
                    <strong>尊重</strong>：對教師和其他學生保持基本尊重
                  </li>
                  <li style={{ marginBottom: "0.5rem" }}>
                    <strong>客觀</strong>：盡量以客觀角度描述課程內容與教學方式
                  </li>
                </ul>
                <p>
                  本服務保留移除違規內容及停權使用者帳號的權利。
                </p>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  5. 匿名性與隱私
                </h2>
                <p style={{ marginBottom: "1rem" }}>
                  本服務採用匿名評論機制，其他使用者無法看到評論者的身份資訊。但請注意：
                </p>
                <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem" }}>
                  <li style={{ marginBottom: "0.5rem" }}>
                    系統會記錄您的帳號資訊以防止濫用
                  </li>
                  <li style={{ marginBottom: "0.5rem" }}>
                    若內容涉及違法行為，我們可能依法配合調查
                  </li>
                  <li style={{ marginBottom: "0.5rem" }}>
                    請勿在評論中透露可識別您身份的資訊
                  </li>
                </ul>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  6. 智慧財產權
                </h2>
                <p style={{ marginBottom: "1rem" }}>
                  本服務的設計、程式碼及介面等智慧財產權歸開發團隊所有。課程資訊來源為國立高雄科技大學公開資料。
                </p>
                <p>
                  您發布的評論內容，您保有著作權，但同時授予本服務非專屬、免費的使用權限，以供本服務展示與運營使用。
                </p>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  7. 免責聲明
                </h2>
                <ul style={{ paddingLeft: "1.5rem", marginBottom: "1rem" }}>
                  <li style={{ marginBottom: "0.5rem" }}>
                    本服務提供的資訊僅供參考，不保證完全正確或即時更新
                  </li>
                  <li style={{ marginBottom: "0.5rem" }}>
                    使用者評論為個人意見，不代表本服務立場
                  </li>
                  <li style={{ marginBottom: "0.5rem" }}>
                    選課決策應綜合考量多方資訊，本服務不對選課結果負責
                  </li>
                  <li style={{ marginBottom: "0.5rem" }}>
                    本服務不保證服務不中斷或無錯誤
                  </li>
                </ul>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  8. 服務變更與終止
                </h2>
                <p style={{ marginBottom: "1rem" }}>
                  本服務保留隨時修改、暫停或終止服務的權利，恕不另行通知。我們會盡力維持服務穩定運作，但不對服務中斷造成的損失負責。
                </p>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  9. 條款修改
                </h2>
                <p>
                  本服務可能不定期修改本服務條款。修改後的條款將公布於本頁面，繼續使用本服務即表示您接受修改後的條款。
                </p>
              </section>

              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
                  10. 聯絡方式
                </h2>
                <p>
                  如對本服務條款有任何疑問，歡迎透過 GitHub Issues 與我們聯繫。
                </p>
              </section>

              <div
                style={{
                  marginTop: "3rem",
                  padding: "1.5rem",
                  backgroundColor: "var(--ts-gray-100)",
                  borderRadius: "8px",
                  textAlign: "center",
                }}
              >
                <p style={{ marginBottom: "1rem", color: "var(--ts-gray-700)" }}>
                  相關文件
                </p>
                <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                  <Link href="/privacy" className="ts-button is-outlined is-small">
                    隱私權政策
                  </Link>
                  <Link href="/cookies" className="ts-button is-outlined is-small">
                    Cookie 說明
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
