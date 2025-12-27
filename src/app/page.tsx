import Link from "next/link";
import { prisma } from "@/lib/db";
import { HomeSearch } from "@/components/HomeSearch";
import { RecommendationSection } from "@/components/RecommendationSection";

function formatCount(n: number) {
  return new Intl.NumberFormat("zh-Hant-TW").format(n);
}

export default async function HomePage() {
  let courseCount = null;
  let instructorCount = null;
  let reviewCount = null;

  // Try to fetch stats, but gracefully handle errors
  if (prisma) {
    try {
      const stats = await Promise.all([
        prisma.course.count(),
        prisma.instructor.count(),
        prisma.review.count(),
      ]);
      courseCount = stats[0];
      instructorCount = stats[1];
      reviewCount = stats[2];
    } catch (error) {
      // Database unavailable - continue with null values
      console.error('Failed to fetch stats:', error);
    }
  }

  return (
    <>
      {/* Hero Section - Minimalist Center Style */}
      <div style={{ borderRadius: 0, border: "none", background: "transparent" }}>
        <div className="app-container">
          <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center", paddingTop: "clamp(4rem, 12vh, 8rem)", paddingBottom: "clamp(3rem, 8vh, 5rem)" }}>
            {/* Minimal badge */}
            <div style={{ marginBottom: "2rem" }}>
              <span style={{
                display: "inline-block",
                padding: "0.5rem 1.25rem",
                borderRadius: "999px",
                background: "var(--ts-gray-100)",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--ts-gray-700)",
                letterSpacing: "0.025em"
              }}>
                高科選課雷達
              </span>
            </div>

            {/* Hero title - Large & Bold */}
            <h1 style={{
              fontSize: "clamp(2.75rem, 7vw, 4.5rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: "1.5rem",
              lineHeight: 1.1,
              color: "var(--ts-gray-900)",
              padding: "0.1em 0"
            }}>
              選課，不只是憑感覺
            </h1>

            {/* Subtitle - Simple & Clear */}
            <p className="app-muted" style={{
              lineHeight: 1.7,
              fontSize: "1.125rem",
              maxWidth: 520,
              margin: "0 auto 3rem",
              fontWeight: 400
            }}>
              查詢課程資訊、閱讀真實評價、做出明智決定
            </p>

            {/* Minimalist Search Bar */}
            <HomeSearch />

            {/* Minimal quick links */}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "4rem" }}>
              <Link href="/courses?q=%E8%B3%87%E6%96%99%E5%BA%AB" style={{ color: "var(--ts-gray-600)", fontSize: "0.9375rem", textDecoration: "underline", textUnderlineOffset: "4px" }}>
                資料庫
              </Link>
              <span style={{ color: "var(--ts-gray-300)" }}>·</span>
              <Link href="/courses?q=%E5%BE%AE%E7%A9%8D%E5%88%86" style={{ color: "var(--ts-gray-600)", fontSize: "0.9375rem", textDecoration: "underline", textUnderlineOffset: "4px" }}>
                微積分
              </Link>
              <span style={{ color: "var(--ts-gray-300)" }}>·</span>
              <Link href="/courses?q=%E8%B3%87%E5%B7%A5" style={{ color: "var(--ts-gray-600)", fontSize: "0.9375rem", textDecoration: "underline", textUnderlineOffset: "4px" }}>
                資工
              </Link>
              <span style={{ color: "var(--ts-gray-300)" }}>·</span>
              <Link href="/courses?q=%E6%BC%94%E7%AE%97%E6%B3%95" style={{ color: "var(--ts-gray-600)", fontSize: "0.9375rem", textDecoration: "underline", textUnderlineOffset: "4px" }}>
                演算法
              </Link>
            </div>

            {/* Minimal stats - Simple numbers */}
            {prisma && (courseCount !== null || instructorCount !== null || reviewCount !== null) ? (
              <div style={{
                display: "flex",
                gap: "clamp(2rem, 5vw, 4rem)",
                justifyContent: "center",
                padding: "2rem 0",
                borderTop: "1px solid var(--ts-gray-200)",
                maxWidth: 600,
                margin: "0 auto"
              }}>
                {courseCount !== null && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 700, color: "var(--ts-gray-900)", marginBottom: "0.25rem" }}>
                      {formatCount(courseCount)}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "var(--ts-gray-600)", fontWeight: 500 }}>課程</div>
                  </div>
                )}
                {instructorCount !== null && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 700, color: "var(--ts-gray-900)", marginBottom: "0.25rem" }}>
                      {formatCount(instructorCount)}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "var(--ts-gray-600)", fontWeight: 500 }}>教師</div>
                  </div>
                )}
                {reviewCount !== null && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 700, color: "var(--ts-gray-900)", marginBottom: "0.25rem" }}>
                      {formatCount(reviewCount)}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "var(--ts-gray-600)", fontWeight: 500 }}>評價</div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main Content - Minimalist Sections */}
      <div className="app-container" style={{ paddingTop: "clamp(4rem, 10vh, 6rem)", paddingBottom: "6rem" }}>
        {/* Recommendation Section */}
        <div style={{ marginBottom: "clamp(4rem, 10vh, 6rem)" }}>
          <RecommendationSection />
        </div>

        {/* Features Section - Simple List */}
        <div style={{ marginBottom: "clamp(4rem, 10vh, 6rem)" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem", maxWidth: 600, margin: "0 auto 4rem" }}>
            <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)", fontWeight: 700, marginBottom: "0.75rem", letterSpacing: "-0.01em", color: "var(--ts-gray-900)" }}>
              為什麼選擇我們
            </h2>
            <p className="app-muted" style={{ fontSize: "1.0625rem", lineHeight: 1.7 }}>
              簡單、透明、有用
            </p>
          </div>
          {/* Simple feature list */}
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ display: "grid", gap: "3rem" }}>
              <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>
                <div style={{ fontSize: "2.5rem", flexShrink: 0 }}>🔒</div>
                <div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--ts-gray-900)" }}>完全匿名保護</h3>
                  <p className="app-muted" style={{ lineHeight: 1.75, fontSize: "1rem" }}>
                    所有評價一律匿名顯示，保護你的身份安全。你可以選擇顯示系所，讓評價更有參考價值。
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>
                <div style={{ fontSize: "2.5rem", flexShrink: 0 }}>✨</div>
                <div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--ts-gray-900)" }}>品質嚴格把關</h3>
                  <p className="app-muted" style={{ lineHeight: 1.75, fontSize: "1rem" }}>
                    每位使用者每門課只能留一則評價，避免灌水和惡意刷評。可以編輯更新內容，保留版本紀錄。
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>
                <div style={{ fontSize: "2.5rem", flexShrink: 0 }}>📊</div>
                <div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--ts-gray-900)" }}>多維度評分</h3>
                  <p className="app-muted" style={{ lineHeight: 1.75, fontSize: "1rem" }}>
                    涼度、實用性、作業量、出席要求等多個維度，讓你全方位了解課程特性。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Simple CTA */}
        <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)", fontWeight: 700, marginBottom: "1rem", letterSpacing: "-0.01em", color: "var(--ts-gray-900)" }}>
            準備好了嗎?
          </h2>
          <p className="app-muted" style={{ fontSize: "1.0625rem", lineHeight: 1.7, marginBottom: "2rem" }}>
            立即開始查詢課程，讓選課不再是一場賭注
          </p>
          <Link href="/courses" className="ts-button is-large is-primary" style={{ padding: "1rem 2.5rem", fontWeight: 600, fontSize: "1.0625rem", borderRadius: "10px" }}>
            開始探索課程
          </Link>
        </div>
      </div>
    </>
  );
}
