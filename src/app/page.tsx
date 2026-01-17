import Link from "next/link";
import { prisma } from "@/lib/db";
import { HomeSearch } from "@/components/HomeSearch";
import { RecommendationSection } from "@/components/RecommendationSection";
import { WebsiteJsonLd, OrganizationJsonLd, FAQJsonLd } from "@/components/JsonLd";
import { getCached, CACHE_TTL } from "@/lib/cache";

// Force dynamic rendering to always fetch fresh stats
export const dynamic = "force-dynamic";

function formatCount(n: number) {
  return new Intl.NumberFormat("zh-Hant-TW").format(n);
}

// 校區資訊
const CAMPUSES = [
  { name: "建工校區", value: "建工" },
  { name: "燕巢校區", value: "燕巢" },
  { name: "第一校區", value: "第一" },
  { name: "楠梓校區", value: "楠梓" },
  { name: "旗津校區", value: "旗津" },
];

// 熱門系所
const POPULAR_DEPARTMENTS = [
  { name: "資訊工程系", value: "資訊工程" },
  { name: "電機工程系", value: "電機工程" },
  { name: "機械工程系", value: "機械工程" },
  { name: "工業工程與管理系", value: "工業工程" },
  { name: "財務管理系", value: "財務管理" },
  { name: "應用英語系", value: "應用英語" },
];

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

// 熱門課程類型
type PopularCourse = {
  id: string;
  name: string;
  department: string | null;
  instructors: string;
  reviewCount: number;
};

// 熱門教師類型
type PopularInstructor = {
  id: string;
  name: string;
  reviewCount: number;
};

// 取得熱門課程（評價數最多）
async function getPopularCourses(): Promise<PopularCourse[]> {
  if (!prisma) return [];

  try {
    return await getCached<PopularCourse[]>(
      "popular-courses-home",
      CACHE_TTL.FILTERS,
      async () => {
        const courses = await prisma!.course.findMany({
          where: {
            reviews: { some: { status: "ACTIVE" } },
          },
          select: {
            id: true,
            courseName: true,
            department: true,
            instructors: {
              select: {
                instructor: { select: { name: true } },
              },
              take: 2,
            },
            _count: { select: { reviews: { where: { status: "ACTIVE" } } } },
          },
          orderBy: { reviews: { _count: "desc" } },
          take: 6,
        });

        return courses.map((c: { id: string; courseName: string; department: string | null; instructors: { instructor: { name: string } }[]; _count: { reviews: number } }) => ({
          id: c.id,
          name: c.courseName,
          department: c.department,
          instructors: c.instructors.map((i: { instructor: { name: string } }) => i.instructor.name).join("、"),
          reviewCount: c._count.reviews,
        }));
      }
    );
  } catch (error) {
    console.error("Failed to fetch popular courses:", error);
    return [];
  }
}

// 取得熱門教師（評價數最多）
async function getPopularInstructors(): Promise<PopularInstructor[]> {
  if (!prisma) return [];

  try {
    return await getCached<PopularInstructor[]>(
      "popular-instructors-home",
      CACHE_TTL.FILTERS,
      async () => {
        const instructors = await prisma!.instructor.findMany({
          where: {
            courses: {
              some: {
                course: {
                  reviews: { some: { status: "ACTIVE" } },
                },
              },
            },
          },
          select: {
            id: true,
            name: true,
            courses: {
              select: {
                course: {
                  select: {
                    _count: { select: { reviews: { where: { status: "ACTIVE" } } } },
                  },
                },
              },
            },
          },
          take: 100, // 先取較多，後續計算排序
        });

        // 計算每位教師的總評價數
        const instructorWithCounts = instructors.map((i: { id: string; name: string; courses: { course: { _count: { reviews: number } } }[] }) => ({
          id: i.id,
          name: i.name,
          reviewCount: i.courses.reduce((sum: number, c: { course: { _count: { reviews: number } } }) => sum + c.course._count.reviews, 0),
        }));

        return instructorWithCounts
          .filter((i: PopularInstructor) => i.reviewCount > 0)
          .sort((a: PopularInstructor, b: PopularInstructor) => b.reviewCount - a.reviewCount)
          .slice(0, 8);
      }
    );
  } catch (error) {
    console.error("Failed to fetch popular instructors:", error);
    return [];
  }
}

export default async function HomePage() {
  let courseCount = null;
  let instructorCount = null;
  let reviewCount = null;
  let popularSearches = DEFAULT_KEYWORDS;
  let popularCourses: PopularCourse[] = [];
  let popularInstructors: PopularInstructor[] = [];

  // Try to fetch stats, but gracefully handle errors
  if (prisma) {
    try {
      const [stats, searches, courses, instructors] = await Promise.all([
        Promise.all([
          prisma.course.count(),
          prisma.instructor.count(),
          prisma.review.count(),
        ]),
        getPopularSearches(),
        getPopularCourses(),
        getPopularInstructors(),
      ]);
      courseCount = stats[0];
      instructorCount = stats[1];
      reviewCount = stats[2];
      popularSearches = searches;
      popularCourses = courses;
      popularInstructors = instructors;
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
      <FAQJsonLd
        items={[
          {
            question: "高科選課雷達是什麼？",
            answer: "高科選課雷達是一個專為高雄科技大學（NKUST）學生設計的課程查詢與評價平台。我們提供課程資訊查詢、匿名評價功能，幫助同學在選課時能夠參考真實的課程體驗，做出更好的選課決定。平台涵蓋建工、燕巢、第一、楠梓、旗津等各校區的課程資訊。",
          },
          {
            question: "如何發表課程評價？",
            answer: "發表評價需要使用高雄科技大學的學校信箱（@nkust.edu.tw）登入。登入後，進入想評價的課程頁面，即可填寫評分和心得。每位使用者對每門課程只能發表一則評價，但可以隨時編輯更新內容。",
          },
          {
            question: "評價是匿名的嗎？",
            answer: "是的，所有評價一律匿名顯示。其他使用者無法看到評價者的身份。你可以選擇是否顯示自己的系所，讓評價更有參考價值，但這完全是自願的。",
          },
          {
            question: "評分維度有哪些？",
            answer: "我們提供多個評分維度，包括：涼度（課程輕鬆程度）、實用性（課程內容的實用價值）、作業量（作業和報告的負擔程度）、出席要求（點名和出席的嚴格程度）、以及整體評分。",
          },
          {
            question: "課程資料來源是什麼？",
            answer: "課程資料來自高雄科技大學的校務系統，包括課程名稱、授課教師、上課時間、地點、學分數等資訊。我們會定期更新資料，確保資訊的準確性。",
          },
          {
            question: "這是學校官方的平台嗎？",
            answer: "不是，高科選課雷達是由學生自發開發的非官方專案。我們的目標是幫助同學更好地了解課程，做出更明智的選課決定。所有資訊僅供參考，最終選課決定請以學校官方公告為準。",
          },
        ]}
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

        {/* Popular Courses Section */}
        {popularCourses.length > 0 && (
          <section style={{ marginBottom: "clamp(4rem, 10vh, 6rem)" }}>
            <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
              <h2
                style={{
                  fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
                  fontWeight: 700,
                  marginBottom: "0.5rem",
                  letterSpacing: "-0.01em",
                  color: "var(--ts-gray-900)",
                }}
              >
                熱門課程
              </h2>
              <p className="app-muted" style={{ fontSize: "1rem" }}>
                最多同學評價的課程
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "1rem",
                maxWidth: 900,
                margin: "0 auto",
              }}
            >
              {popularCourses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="ts-box is-hollowed"
                  style={{
                    padding: "1.25rem",
                    display: "block",
                    textDecoration: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "1.0625rem",
                      fontWeight: 600,
                      marginBottom: "0.5rem",
                      color: "var(--ts-gray-900)",
                    }}
                  >
                    {course.name}
                  </h3>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--ts-gray-600)",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {course.instructors || "未知教師"}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--ts-gray-500)" }}>
                    {course.department} · {course.reviewCount} 則評價
                  </div>
                </Link>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              <Link
                href="/courses"
                className="ts-button is-outlined"
                style={{ fontWeight: 500 }}
              >
                查看所有課程
              </Link>
            </div>
          </section>
        )}

        {/* Popular Instructors Section */}
        {popularInstructors.length > 0 && (
          <section style={{ marginBottom: "clamp(4rem, 10vh, 6rem)" }}>
            <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
              <h2
                style={{
                  fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
                  fontWeight: 700,
                  marginBottom: "0.5rem",
                  letterSpacing: "-0.01em",
                  color: "var(--ts-gray-900)",
                }}
              >
                熱門教師
              </h2>
              <p className="app-muted" style={{ fontSize: "1rem" }}>
                最多課程評價的教師
              </p>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                justifyContent: "center",
                maxWidth: 800,
                margin: "0 auto",
              }}
            >
              {popularInstructors.map((instructor) => (
                <Link
                  key={instructor.id}
                  href={`/instructors/${instructor.id}`}
                  className="ts-chip is-outlined"
                  style={{
                    padding: "0.625rem 1rem",
                    fontSize: "0.9375rem",
                    textDecoration: "none",
                  }}
                >
                  {instructor.name}
                  <span
                    style={{
                      marginLeft: "0.5rem",
                      fontSize: "0.75rem",
                      color: "var(--ts-gray-500)",
                    }}
                  >
                    {instructor.reviewCount} 評價
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Campus Quick Links */}
        <section style={{ marginBottom: "clamp(4rem, 10vh, 6rem)" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <h2
              style={{
                fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
                fontWeight: 700,
                marginBottom: "0.5rem",
                letterSpacing: "-0.01em",
                color: "var(--ts-gray-900)",
              }}
            >
              依校區瀏覽
            </h2>
            <p className="app-muted" style={{ fontSize: "1rem" }}>
              高雄科技大學各校區課程
            </p>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              justifyContent: "center",
              maxWidth: 700,
              margin: "0 auto 2rem",
            }}
          >
            {CAMPUSES.map((campus) => (
              <Link
                key={campus.value}
                href={`/courses?campus=${encodeURIComponent(campus.value)}`}
                className="ts-button is-outlined"
                style={{ fontWeight: 500 }}
              >
                {campus.name}
              </Link>
            ))}
          </div>
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                marginBottom: "1rem",
                color: "var(--ts-gray-700)",
              }}
            >
              熱門系所
            </h3>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              justifyContent: "center",
              maxWidth: 700,
              margin: "0 auto",
            }}
          >
            {POPULAR_DEPARTMENTS.map((dept) => (
              <Link
                key={dept.value}
                href={`/courses?q=${encodeURIComponent(dept.value)}`}
                style={{
                  color: "var(--ts-gray-600)",
                  fontSize: "0.9375rem",
                  textDecoration: "underline",
                  textUnderlineOffset: "4px",
                  padding: "0.25rem 0.5rem",
                }}
              >
                {dept.name}
              </Link>
            ))}
          </div>
        </section>

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

        {/* FAQ Section */}
        <section style={{ marginBottom: "clamp(4rem, 10vh, 6rem)" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2
              style={{
                fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
                fontWeight: 700,
                marginBottom: "0.5rem",
                letterSpacing: "-0.01em",
                color: "var(--ts-gray-900)",
              }}
            >
              常見問題
            </h2>
            <p className="app-muted" style={{ fontSize: "1rem" }}>
              關於高科選課雷達的疑問解答
            </p>
          </div>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ display: "grid", gap: "1.5rem" }}>
              <article className="ts-box is-hollowed" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--ts-gray-900)" }}>
                  高科選課雷達是什麼？
                </h3>
                <p className="app-muted" style={{ lineHeight: 1.75, fontSize: "0.9375rem" }}>
                  高科選課雷達是一個專為高雄科技大學（NKUST）學生設計的課程查詢與評價平台。我們提供課程資訊查詢、匿名評價功能，幫助同學在選課時能夠參考真實的課程體驗，做出更好的選課決定。平台涵蓋建工、燕巢、第一、楠梓、旗津等各校區的課程資訊。
                </p>
              </article>

              <article className="ts-box is-hollowed" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--ts-gray-900)" }}>
                  如何發表課程評價？
                </h3>
                <p className="app-muted" style={{ lineHeight: 1.75, fontSize: "0.9375rem" }}>
                  發表評價需要使用高雄科技大學的學校信箱（@nkust.edu.tw）登入。登入後，進入想評價的課程頁面，即可填寫評分和心得。每位使用者對每門課程只能發表一則評價，但可以隨時編輯更新內容。評價會經過系統審核，確保內容品質。
                </p>
              </article>

              <article className="ts-box is-hollowed" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--ts-gray-900)" }}>
                  評價是匿名的嗎？
                </h3>
                <p className="app-muted" style={{ lineHeight: 1.75, fontSize: "0.9375rem" }}>
                  是的，所有評價一律匿名顯示。其他使用者無法看到評價者的身份。你可以選擇是否顯示自己的系所，讓評價更有參考價值，但這完全是自願的。我們重視隱私保護，不會透露任何可識別個人身份的資訊。
                </p>
              </article>

              <article className="ts-box is-hollowed" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--ts-gray-900)" }}>
                  評分維度有哪些？
                </h3>
                <p className="app-muted" style={{ lineHeight: 1.75, fontSize: "0.9375rem" }}>
                  我們提供多個評分維度，包括：涼度（課程輕鬆程度）、實用性（課程內容的實用價值）、作業量（作業和報告的負擔程度）、出席要求（點名和出席的嚴格程度）、以及整體評分。這些多維度的評分讓你可以全方位了解課程特性，找到最適合自己的課程。
                </p>
              </article>

              <article className="ts-box is-hollowed" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--ts-gray-900)" }}>
                  課程資料來源是什麼？
                </h3>
                <p className="app-muted" style={{ lineHeight: 1.75, fontSize: "0.9375rem" }}>
                  課程資料來自高雄科技大學的校務系統，包括課程名稱、授課教師、上課時間、地點、學分數等資訊。我們會定期更新資料，確保資訊的準確性。評價則完全由學生自行發表，反映真實的課程體驗。
                </p>
              </article>

              <article className="ts-box is-hollowed" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--ts-gray-900)" }}>
                  這是學校官方的平台嗎？
                </h3>
                <p className="app-muted" style={{ lineHeight: 1.75, fontSize: "0.9375rem" }}>
                  不是，高科選課雷達是由學生自發開發的非官方專案。我們的目標是幫助同學更好地了解課程，做出更明智的選課決定。所有資訊僅供參考，最終選課決定請以學校官方公告為準。
                </p>
              </article>
            </div>
          </div>
        </section>

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
