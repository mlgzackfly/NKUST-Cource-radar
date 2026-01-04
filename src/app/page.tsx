import Link from "next/link";
import { prisma } from "@/lib/db";
import { HomeSearch } from "@/components/HomeSearch";
import { RecommendationSection } from "@/components/RecommendationSection";
import { WebsiteJsonLd, OrganizationJsonLd } from "@/components/JsonLd";
import { getCached, CACHE_TTL } from "@/lib/cache";

// Force dynamic rendering to always fetch fresh stats
export const dynamic = "force-dynamic";

function formatCount(n: number) {
  return new Intl.NumberFormat("zh-Hant-TW").format(n);
}

// 預設的熱門搜尋關鍵字
const DEFAULT_KEYWORDS = ["程式設計", "微積分", "資料結構", "演算法"];

// 停用詞
const STOP_WORDS = new Set([
  "的", "與", "及", "和", "之", "或", "等", "一", "二", "三", "四",
  "上", "下", "甲", "乙", "丙", "丁", "I", "II", "III", "IV",
]);

// 提取課程名稱中的關鍵字
function extractKeywords(courseName: string): string[] {
  const cleaned = courseName
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/[ⅠⅡⅢⅣ]/g, "")
    .trim();

  const keywords: string[] = [];
  const parts = cleaned.split(/[與及和、,，]/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length >= 2 && trimmed.length <= 10 && !STOP_WORDS.has(trimmed)) {
      keywords.push(trimmed);
    }
  }

  if (keywords.length === 0 && cleaned.length >= 2 && cleaned.length <= 10) {
    keywords.push(cleaned);
  }

  return keywords;
}

// 取得熱門搜尋關鍵字
async function getPopularSearches(): Promise<string[]> {
  if (!prisma) return DEFAULT_KEYWORDS;

  try {
    return await getCached<string[]>(
      "popular-searches",
      CACHE_TTL.FILTERS,
      async () => {
        const coursesWithReviews = await prisma!.course.findMany({
          where: {
            reviews: { some: { status: "ACTIVE" } },
          },
          select: {
            courseName: true,
            _count: { select: { reviews: { where: { status: "ACTIVE" } } } },
          },
          orderBy: { reviews: { _count: "desc" } },
          take: 100,
        });

        const keywordCounts = new Map<string, number>();

        for (const course of coursesWithReviews) {
          const keywords = extractKeywords(course.courseName);
          const reviewCount = course._count.reviews;

          for (const keyword of keywords) {
            const current = keywordCounts.get(keyword) || 0;
            keywordCounts.set(keyword, current + reviewCount);
          }
        }

        const sorted = Array.from(keywordCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([keyword]) => keyword);

        // 補充預設關鍵字
        while (sorted.length < 4) {
          const next = DEFAULT_KEYWORDS.find((d) => !sorted.includes(d));
          if (next) sorted.push(next);
          else break;
        }

        return sorted.slice(0, 6);
      }
    );
  } catch (error) {
    console.error("Failed to fetch popular searches:", error);
    return DEFAULT_KEYWORDS;
  }
}

export default async function HomePage() {
  let courseCount = null;
  let instructorCount = null;
  let reviewCount = null;
  let popularSearches = DEFAULT_KEYWORDS;

  // Try to fetch stats, but gracefully handle errors
  if (prisma) {
    try {
      const [stats, searches] = await Promise.all([
        Promise.all([
          prisma.course.count(),
          prisma.instructor.count(),
          prisma.review.count(),
        ]),
        getPopularSearches(),
      ]);
      courseCount = stats[0];
      instructorCount = stats[1];
      reviewCount = stats[2];
      popularSearches = searches;
    } catch (error) {
      // Database unavailable - continue with null values
      console.error("Failed to fetch stats:", error);
    }
  }

  const baseUrl = process.env.NEXTAUTH_URL || "https://nkust-course.zeabur.app";

  return (
    <>
      {/* JSON-LD 結構化資料 */}
      <WebsiteJsonLd
        name="高科選課雷達"
        description="提供 NKUST 課程查詢與匿名評價，讓你選課不再憑感覺。查看課程評分、教師評價、涼度指數等資訊。"
        url={baseUrl}
      />
      <OrganizationJsonLd
        name="高科選課雷達"
        url={baseUrl}
        logo={`${baseUrl}/icon.svg`}
        description="高雄科技大學課程查詢與匿名評價平台"
      />

      {/* Hero Section - Minimalist Center Style */}
      <div style={{ borderRadius: 0, border: "none", background: "transparent" }}>
        <div className="app-container">
          <div
            style={{
              maxWidth: 680,
              margin: "0 auto",
              textAlign: "center",
              paddingTop: "clamp(4rem, 12vh, 8rem)",
              paddingBottom: "clamp(3rem, 8vh, 5rem)",
            }}
          >
            {/* Minimal badge */}
            <div style={{ marginBottom: "2rem" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "0.5rem 1.25rem",
                  borderRadius: "999px",
                  background: "var(--ts-gray-100)",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "var(--ts-gray-700)",
                  letterSpacing: "0.025em",
                }}
              >
                高科選課雷達
              </span>
            </div>

            {/* Hero title - Large & Bold */}
            <h1
              style={{
                fontSize: "clamp(2.75rem, 7vw, 4.5rem)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginBottom: "1.5rem",
                lineHeight: 1.1,
                color: "var(--ts-gray-900)",
                padding: "0.1em 0",
              }}
            >
              選課，不只是憑感覺
            </h1>

            {/* Subtitle - Simple & Clear */}
            <p
              className="app-muted"
              style={{
                lineHeight: 1.7,
                fontSize: "1.125rem",
                maxWidth: 520,
                margin: "0 auto 3rem",
                fontWeight: 400,
              }}
            >
              查詢課程資訊、閱讀真實評價、做出明智決定
            </p>

            {/* Minimalist Search Bar */}
            <HomeSearch />

            {/* Dynamic popular search links */}
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "center",
                flexWrap: "wrap",
                marginBottom: "4rem",
              }}
            >
              {popularSearches.map((keyword, index) => (
                <span key={keyword} style={{ display: "contents" }}>
                  {index > 0 && <span style={{ color: "var(--ts-gray-300)" }}>·</span>}
                  <Link
                    href={`/courses?q=${encodeURIComponent(keyword)}`}
                    style={{
                      color: "var(--ts-gray-600)",
                      fontSize: "0.9375rem",
                      textDecoration: "underline",
                      textUnderlineOffset: "4px",
                    }}
                  >
                    {keyword}
                  </Link>
                </span>
              ))}
            </div>

            {/* Minimal stats - Simple numbers */}
            {prisma &&
            (courseCount !== null || instructorCount !== null || reviewCount !== null) ? (
              <div
                style={{
                  display: "flex",
                  gap: "clamp(2rem, 5vw, 4rem)",
                  justifyContent: "center",
                  padding: "2rem 0",
                  borderTop: "1px solid var(--ts-gray-200)",
                  maxWidth: 600,
                  margin: "0 auto",
                }}
              >
                {courseCount !== null && (
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                        fontWeight: 700,
                        color: "var(--ts-gray-900)",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {formatCount(courseCount)}
                    </div>
                    <div
                      style={{ fontSize: "0.875rem", color: "var(--ts-gray-600)", fontWeight: 500 }}
                    >
                      課程
                    </div>
                  </div>
                )}
                {instructorCount !== null && (
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                        fontWeight: 700,
                        color: "var(--ts-gray-900)",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {formatCount(instructorCount)}
                    </div>
                    <div
                      style={{ fontSize: "0.875rem", color: "var(--ts-gray-600)", fontWeight: 500 }}
                    >
                      教師
                    </div>
                  </div>
                )}
                {reviewCount !== null && (
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                        fontWeight: 700,
                        color: "var(--ts-gray-900)",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {formatCount(reviewCount)}
                    </div>
                    <div
                      style={{ fontSize: "0.875rem", color: "var(--ts-gray-600)", fontWeight: 500 }}
                    >
                      評價
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main Content - Minimalist Sections */}
      <div
        className="app-container"
        style={{ paddingTop: "clamp(4rem, 10vh, 6rem)", paddingBottom: "6rem" }}
      >
        {/* Recommendation Section */}
        <div style={{ marginBottom: "clamp(4rem, 10vh, 6rem)" }}>
          <RecommendationSection />
        </div>

        {/* Features Section - Simple List */}
        <div style={{ marginBottom: "clamp(4rem, 10vh, 6rem)" }}>
          <div
            style={{
              textAlign: "center",
              marginBottom: "4rem",
              maxWidth: 600,
              margin: "0 auto 4rem",
            }}
          >
            <h2
              style={{
                fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
                fontWeight: 700,
                marginBottom: "0.75rem",
                letterSpacing: "-0.01em",
                color: "var(--ts-gray-900)",
              }}
            >
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
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      marginBottom: "0.5rem",
                      color: "var(--ts-gray-900)",
                    }}
                  >
                    完全匿名保護
                  </h3>
                  <p className="app-muted" style={{ lineHeight: 1.75, fontSize: "1rem" }}>
                    所有評價一律匿名顯示，保護你的身份安全。你可以選擇顯示系所，讓評價更有參考價值。
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>
                <div style={{ fontSize: "2.5rem", flexShrink: 0 }}>✨</div>
                <div>
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      marginBottom: "0.5rem",
                      color: "var(--ts-gray-900)",
                    }}
                  >
                    品質嚴格把關
                  </h3>
                  <p className="app-muted" style={{ lineHeight: 1.75, fontSize: "1rem" }}>
                    每位使用者每門課只能留一則評價，避免灌水和惡意刷評。可以編輯更新內容，保留版本紀錄。
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>
                <div style={{ fontSize: "2.5rem", flexShrink: 0 }}>📊</div>
                <div>
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      marginBottom: "0.5rem",
                      color: "var(--ts-gray-900)",
                    }}
                  >
                    多維度評分
                  </h3>
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
          <h2
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
              fontWeight: 700,
              marginBottom: "1rem",
              letterSpacing: "-0.01em",
              color: "var(--ts-gray-900)",
            }}
          >
            準備好了嗎?
          </h2>
          <p
            className="app-muted"
            style={{ fontSize: "1.0625rem", lineHeight: 1.7, marginBottom: "2rem" }}
          >
            立即開始查詢課程，讓選課不再是一場賭注
          </p>
          <Link
            href="/courses"
            className="ts-button is-large is-primary"
            style={{
              padding: "1rem 2.5rem",
              fontWeight: 600,
              fontSize: "1.0625rem",
              borderRadius: "10px",
            }}
          >
            開始探索課程
          </Link>
        </div>
      </div>
    </>
  );
}
