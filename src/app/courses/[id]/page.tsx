import { notFound } from "next/navigation";
import Link from "next/link";
// @ts-expect-error - Next.js 15.5.9 type definition issue
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCourseRatingSummary } from "@/lib/reviewSummary";
import { formatSemester, formatTerm } from "@/lib/semesterFormatter";
import CourseSummaryChart from "@/components/CourseSummaryChart";
import { CourseTimeTable } from "@/components/CourseTimeTable";
import { ReviewForm } from "@/components/ReviewForm";
import { ReviewList } from "@/components/ReviewList";
import { InstructorLinks } from "@/components/InstructorLinks";
import { FavoriteButton } from "@/components/FavoriteButton";
import { CourseJsonLd, BreadcrumbJsonLd } from "@/components/JsonLd";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

type CoursePageProps = {
  params: Promise<{ id: string }>;
};

// 動態生成課程頁面的 metadata
export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const p = await params;
  const baseUrl = process.env.NEXTAUTH_URL || "https://nkust-course.zeabur.app";

  if (!prisma) {
    return {
      title: "課程詳情 | 高科選課雷達",
    };
  }

  try {
    const course = await prisma.course.findUnique({
      where: { id: p.id },
      select: {
        courseName: true,
        year: true,
        term: true,
        department: true,
        campus: true,
        credits: true,
        instructors: {
          select: {
            instructor: { select: { name: true } },
          },
        },
      },
    });

    if (!course) {
      return {
        title: "課程不存在 | 高科選課雷達",
      };
    }

    const instructors = course.instructors.map((x: { instructor: { name: string } }) => x.instructor.name).join("、");
    const semester = formatSemester(course.year, course.term);
    const title = `${course.courseName} - ${instructors || "未知教師"} | 高科選課雷達`;
    const description = `查看 ${course.courseName} 的課程評價與詳細資訊。教師：${instructors || "未知"}｜${semester}｜${course.department || ""}｜${course.campus || ""}｜${course.credits || 0} 學分`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${baseUrl}/courses/${p.id}`,
        siteName: "高科選課雷達",
        locale: "zh_TW",
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
      alternates: {
        canonical: `${baseUrl}/courses/${p.id}`,
      },
    };
  } catch {
    return {
      title: "課程詳情 | 高科選課雷達",
    };
  }
}

type CourseDetail = {
  id: string;
  year: string;
  term: string;
  campus: string | null;
  division: string | null;
  department: string | null;
  unitId: string | null;
  selectCode: string | null;
  courseCode: string | null;
  courseName: string;
  className: string | null;
  combinedClassName: string | null;
  credits: number | null;
  lectureHours: number | null;
  labHours: number | null;
  requiredOrElective: string | null;
  classroom: string | null;
  time: string | null;
  enrolled: number | null;
  capacity: number | null;
  englishTaught: string | null;
  distanceLearning: string | null;
  note: string | null;
  syllabusUrl: string | null;
  syllabusData: any | null;
  instructors: Array<{ instructor: { id: string; name: string } }>;
};

function FieldRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <tr>
      <td
        style={{ width: 140, opacity: 0.75, whiteSpace: "nowrap", paddingTop: 8, paddingBottom: 8 }}
      >
        {label}
      </td>
      <td style={{ paddingTop: 8, paddingBottom: 8 }}>{value}</td>
    </tr>
  );
}

export default async function CoursePage({ params }: CoursePageProps) {
  const p = await params;
  if (!prisma) {
    return (
      <div className="app-container" style={{ paddingTop: "1.5rem" }}>
        <div className="ts-box is-raised">
          <div className="ts-content">
            <Link className="ts-button is-ghost is-short" href="/courses">
              ← 回課程列表
            </Link>
            <div className="ts-space" />
            <div className="ts-header is-large">尚未連線資料庫</div>
            <div className="ts-space" />
            <div className="ts-notice is-negative">
              <div className="title">無法載入課程</div>
              <div className="content">
                目前尚未設定 <code>DATABASE_URL</code>,所以暫時無法載入課程詳情。請先連線 PostgreSQL
                並匯入資料後再試。
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  let course;
  let summary = null;
  let reviewsData = null;
  let userHasReviewed = false;
  let isNkustUser = false;
  let currentUserId: string | null = null;

  try {
    course = await prisma.course.findUnique({
      where: { id: p.id },
      select: {
        id: true,
        year: true,
        term: true,
        campus: true,
        division: true,
        department: true,
        unitId: true,
        selectCode: true,
        courseCode: true,
        courseName: true,
        className: true,
        combinedClassName: true,
        credits: true,
        lectureHours: true,
        labHours: true,
        requiredOrElective: true,
        classroom: true,
        time: true,
        enrolled: true,
        capacity: true,
        englishTaught: true,
        distanceLearning: true,
        note: true,
        syllabusUrl: true,
        syllabusData: true,
        instructors: {
          select: {
            instructor: { select: { id: true, name: true } },
          },
        },
      },
    });

    const typedCourse = course as CourseDetail | null;
    if (!typedCourse) {
      notFound();
    }

    summary = await getCourseRatingSummary(typedCourse.id);

    // Fetch reviews directly from database
    try {
      const session = await getServerSession(authOptions);
      isNkustUser = session?.user?.email?.toLowerCase().endsWith("@nkust.edu.tw") ?? false;

      if (isNkustUser && session?.user?.email) {
        // Check if user has already reviewed this course
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
        });

        if (user) {
          currentUserId = user.id;

          const existingReview = await prisma.review.findUnique({
            where: {
              userId_courseId: {
                userId: user.id,
                courseId: typedCourse.id,
              },
            },
          });
          userHasReviewed = !!existingReview;
        }

        // Fetch all reviews for this course
        const reviews = await prisma.review.findMany({
          where: { courseId: typedCourse.id, status: "ACTIVE" },
          orderBy: [{ createdAt: "desc" }],
          take: 20,
          select: {
            id: true,
            userId: true,
            createdAt: true,
            updatedAt: true,
            coolness: true,
            usefulness: true,
            workload: true,
            attendance: true,
            grading: true,
            body: true,
            authorDept: true,
            _count: {
              select: {
                helpfulVotes: true,
                comments: true,
              },
            },
            helpfulVotes: {
              select: {
                voteType: true,
                userId: true,
              },
            },
          },
        });

        reviewsData = reviews.map(
          (r: {
            id: string;
            userId: string;
            createdAt: Date;
            updatedAt: Date;
            coolness: number | null;
            usefulness: number | null;
            workload: number | null;
            attendance: number | null;
            grading: number | null;
            body: string | null;
            authorDept: string | null;
            _count: { helpfulVotes: number; comments: number };
            helpfulVotes: Array<{ voteType: string; userId: string }>;
          }) => {
            const upvotes = r.helpfulVotes.filter((v) => v.voteType === "UPVOTE").length;
            const downvotes = r.helpfulVotes.filter((v) => v.voteType === "DOWNVOTE").length;
            const currentUserVote =
              r.helpfulVotes.find((v) => v.userId === currentUserId)?.voteType || null;

            return {
              id: r.id,
              isOwnReview: r.userId === currentUserId, // ✅ 使用布林值而非 userId
              createdAt: r.createdAt.toISOString(),
              updatedAt: r.updatedAt.toISOString(),
              coolness: r.coolness,
              usefulness: r.usefulness,
              workload: r.workload,
              attendance: r.attendance,
              grading: r.grading,
              body: r.body,
              authorDept: r.authorDept,
              votes: {
                upvotes,
                downvotes,
                netScore: upvotes - downvotes,
                currentUserVote,
              },
              helpfulCount: r._count.helpfulVotes,
              commentCount: r._count.comments,
            };
          }
        );
      }
    } catch (reviewError) {
      console.error("Failed to fetch reviews:", reviewError);
      // Continue rendering without reviews
    }
  } catch (error) {
    console.error("Failed to fetch course:", error);
    return (
      <div className="app-container" style={{ paddingTop: "1.5rem" }}>
        <div className="ts-box is-raised">
          <div className="ts-content">
            <Link className="ts-button is-ghost is-short" href="/courses">
              ← 回課程列表
            </Link>
            <div className="ts-space" />
            <div className="ts-header is-large">無法載入課程</div>
            <div className="ts-space" />
            <div className="ts-notice is-negative">
              <div className="title">資料庫連線失敗</div>
              <div className="content">無法連線到資料庫伺服器,請稍後再試或聯繫管理員。</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const typedCourse = course as CourseDetail;
  const instructors = typedCourse.instructors.map((x) => x.instructor.name).join("、");

  const coursesHref = (sp: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (!v) continue;
      params.set(k, v);
    }
    const q = params.toString();
    return q ? `/courses?${q}` : "/courses";
  };

  const chips = [
    { label: "學年", value: `${typedCourse.year}學年度` },
    { label: "學期", value: formatTerm(typedCourse.term) },
    typedCourse.campus ? { label: "校區", value: typedCourse.campus } : null,
    typedCourse.division ? { label: "學制", value: typedCourse.division } : null,
    typedCourse.department ? { label: "系所", value: typedCourse.department } : null,
    typedCourse.requiredOrElective
      ? { label: "必/選", value: typedCourse.requiredOrElective }
      : null,
    typedCourse.credits !== null ? { label: "學分", value: String(typedCourse.credits) } : null,
    typedCourse.selectCode ? { label: "選課代號", value: typedCourse.selectCode } : null,
    typedCourse.courseCode ? { label: "永久課號", value: typedCourse.courseCode } : null,
    typedCourse.className ? { label: "班級", value: typedCourse.className } : null,
    typedCourse.englishTaught ? { label: "全英語", value: typedCourse.englishTaught } : null,
    typedCourse.distanceLearning ? { label: "遠距", value: typedCourse.distanceLearning } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const baseUrl = process.env.NEXTAUTH_URL || "https://nkust-course.zeabur.app";

  return (
    <>
      {/* JSON-LD 結構化資料 */}
      <CourseJsonLd
        name={typedCourse.courseName}
        description={typedCourse.syllabusData?.objectives || `${typedCourse.courseName} - 高雄科技大學課程`}
        instructor={instructors || undefined}
        provider="國立高雄科技大學"
        url={`${baseUrl}/courses/${typedCourse.id}`}
        credits={typedCourse.credits}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "首頁", url: baseUrl },
          { name: "課程列表", url: `${baseUrl}/courses` },
          { name: typedCourse.courseName, url: `${baseUrl}/courses/${typedCourse.id}` },
        ]}
      />

    <div className="app-container" style={{ paddingTop: "1.5rem", paddingBottom: "3rem" }}>
      {/* Hero Section */}
      <div className="ts-box is-raised app-course-hero" style={{ marginBottom: "1.5rem" }}>
        <div className="ts-content">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <Link className="ts-button is-ghost is-short" href="/courses">
              ← 回課程列表
            </Link>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              {typedCourse.year && typedCourse.term ? (
                <Link
                  className="ts-button is-outlined is-short"
                  href={coursesHref({ year: typedCourse.year, term: typedCourse.term })}
                >
                  同學期
                </Link>
              ) : null}
              {typedCourse.department ? (
                <Link
                  className="ts-button is-outlined is-short"
                  href={coursesHref({ department: typedCourse.department })}
                >
                  同系所
                </Link>
              ) : null}
              {typedCourse.campus ? (
                <Link
                  className="ts-button is-outlined is-short"
                  href={coursesHref({ campus: typedCourse.campus })}
                >
                  同校區
                </Link>
              ) : null}
              <FavoriteButton courseId={typedCourse.id} />
            </div>
          </div>

          <div className="ts-header is-large" style={{ marginBottom: "0.5rem" }}>
            {typedCourse.courseName}
          </div>
          {typedCourse.syllabusData?.courseNameEn && (
            <div
              style={{
                fontSize: "1.125rem",
                color: "var(--ts-gray-600)",
                marginBottom: "0.75rem",
                fontWeight: 500,
              }}
            >
              {typedCourse.syllabusData.courseNameEn}
            </div>
          )}
          <div className="app-muted" style={{ lineHeight: 1.6, fontSize: "0.95rem" }}>
            {typedCourse.instructors.length > 0 && (
              <>
                教師：
                <InstructorLinks instructors={typedCourse.instructors} /> ·{" "}
              </>
            )}
            {typedCourse.department || "—"} · {typedCourse.campus || "—"} ·{" "}
            {formatSemester(typedCourse.year, typedCourse.term)}
          </div>
        </div>
      </div>

      {/* Main Content - Sticky Sidebar Layout */}
      <div className="app-course-detail-layout">
        {/* Left Column - Course Info */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "grid", gap: "1.5rem" }}>
            <div className="ts-box is-raised">
              <div className="ts-content" style={{ padding: "2rem" }}>
                <div
                  className="ts-header"
                  style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}
                >
                  課程資訊
                </div>
                <table className="ts-table is-basic" style={{ fontSize: "0.9375rem" }}>
                  <tbody>
                    <tr>
                      <th
                        style={{
                          width: "30%",
                          verticalAlign: "top",
                          padding: "0.75rem 1rem",
                          fontWeight: 600,
                          color: "var(--ts-gray-700)",
                        }}
                      >
                        教師
                      </th>
                      <td style={{ padding: "0.75rem 1rem", color: "var(--ts-gray-900)" }}>
                        {typedCourse.instructors.length > 0 ? (
                          <InstructorLinks instructors={typedCourse.instructors} />
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                    </tr>
                    <FieldRow label="選課代號" value={typedCourse.selectCode} />
                    <FieldRow label="永久課號" value={typedCourse.courseCode} />
                    <FieldRow label="班級" value={typedCourse.className} />
                    <FieldRow label="合班班級" value={typedCourse.combinedClassName} />
                    <FieldRow
                      label="授課/實習"
                      value={
                        typedCourse.lectureHours || typedCourse.labHours
                          ? `${typedCourse.lectureHours ?? "-"} / ${typedCourse.labHours ?? "-"}`
                          : null
                      }
                    />
                    <FieldRow label="教室" value={typedCourse.classroom} />
                    <FieldRow label="上課時間" value={typedCourse.time} />
                    <FieldRow
                      label="修課人數/上限"
                      value={
                        typedCourse.enrolled || typedCourse.capacity
                          ? `${typedCourse.enrolled ?? "-"} / ${typedCourse.capacity ?? "-"}`
                          : null
                      }
                    />
                  </tbody>
                </table>

                {chips.length > 0 && (
                  <>
                    <div style={{ height: "1.5rem" }} />
                    <div className="ts-wrap is-compact">
                      {chips.map((c) => {
                        const getChipClass = (label: string) => {
                          switch (label) {
                            case "必/選":
                            case "全英語":
                            case "遠距":
                              return "ts-chip is-primary is-small";
                            default:
                              return "ts-chip is-outlined is-small";
                          }
                        };
                        return (
                          <div key={`${c.label}:${c.value}`} className={getChipClass(c.label)}>
                            <div className="content">
                              {c.label}：{c.value}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Course Time Table */}
            {typedCourse.time && (
              <div className="ts-box is-raised">
                <div className="ts-content" style={{ padding: "2rem" }}>
                  <div
                    className="ts-header"
                    style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}
                  >
                    課程時間表
                  </div>
                  <CourseTimeTable
                    timeString={typedCourse.time}
                    courseName={typedCourse.courseName}
                  />
                </div>
              </div>
            )}

            {typedCourse.note ? (
              <div className="ts-box is-raised">
                <div className="ts-content" style={{ padding: "2rem" }}>
                  <div className="ts-notice is-outlined">
                    <div className="title">備註</div>
                    <div className="content">{typedCourse.note}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Syllabus Section */}
            {typedCourse.syllabusData && (
              <div className="ts-box is-raised">
                <div className="ts-content" style={{ padding: "2rem" }}>
                  <div
                    className="ts-header"
                    style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}
                  >
                    授課大綱
                  </div>

                  {typedCourse.syllabusData.objectives && (
                    <div style={{ marginBottom: "1.5rem" }}>
                      <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>課程目標</div>
                      <div
                        style={{
                          padding: "1rem",
                          backgroundColor: "var(--app-surface)",
                          borderRadius: "8px",
                          lineHeight: 1.7,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {typedCourse.syllabusData.objectives}
                      </div>
                    </div>
                  )}

                  {typedCourse.syllabusData.outline && (
                    <div style={{ marginBottom: "1.5rem" }}>
                      <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>課程大綱</div>
                      <div
                        style={{
                          padding: "1rem",
                          backgroundColor: "var(--app-surface)",
                          borderRadius: "8px",
                          lineHeight: 1.7,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {typedCourse.syllabusData.outline}
                      </div>
                    </div>
                  )}

                  {typedCourse.syllabusData.teachingMethod && (
                    <div style={{ marginBottom: "1.5rem" }}>
                      <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>授課方式</div>
                      <div
                        style={{
                          padding: "1rem",
                          backgroundColor: "var(--app-surface)",
                          borderRadius: "8px",
                          lineHeight: 1.7,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {typedCourse.syllabusData.teachingMethod}
                      </div>
                    </div>
                  )}

                  {typedCourse.syllabusData.evaluation && (
                    <div style={{ marginBottom: "1.5rem" }}>
                      <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>評量方式</div>
                      <div
                        style={{
                          padding: "1rem",
                          backgroundColor: "var(--app-surface)",
                          borderRadius: "8px",
                          lineHeight: 1.7,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {typedCourse.syllabusData.evaluation}
                      </div>
                    </div>
                  )}

                  {typedCourse.syllabusData.textbooks && (
                    <div style={{ marginBottom: "1.5rem" }}>
                      <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>指定用書</div>
                      <div
                        style={{
                          padding: "1rem",
                          backgroundColor: "var(--app-surface)",
                          borderRadius: "8px",
                          lineHeight: 1.7,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {typedCourse.syllabusData.textbooks}
                      </div>
                    </div>
                  )}

                  {typedCourse.syllabusData.references && (
                    <div style={{ marginBottom: "1.5rem" }}>
                      <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>參考書籍</div>
                      <div
                        style={{
                          padding: "1rem",
                          backgroundColor: "var(--app-surface)",
                          borderRadius: "8px",
                          lineHeight: 1.7,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {typedCourse.syllabusData.references}
                      </div>
                    </div>
                  )}

                  {typedCourse.syllabusUrl && (
                    <div style={{ marginTop: "1.5rem" }}>
                      <a
                        href={typedCourse.syllabusUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ts-button is-outlined is-small"
                      >
                        查看完整授課大綱 →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Review Form */}
            <ReviewForm courseId={typedCourse.id} userHasReviewed={userHasReviewed} />

            {/* Review List */}
            <ReviewList reviews={reviewsData} courseId={typedCourse.id} />
          </div>
        </div>

        {/* Right Sidebar - Sticky Rating Summary */}
        <aside style={{ position: "sticky", top: "calc(72px + 2rem)", alignSelf: "start" }}>
          <div className="ts-box is-raised" style={{ border: "2px solid var(--ts-gray-200)" }}>
            <div className="ts-content" style={{ padding: "2rem" }}>
              {/* Rating Header */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div
                  className="ts-header"
                  style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}
                >
                  評分摘要
                </div>
                <div className="app-muted" style={{ fontSize: "0.9375rem" }}>
                  總評論數：
                  <span style={{ fontWeight: 600, color: "var(--ts-gray-900)" }}>
                    {summary.totalReviews}
                  </span>
                </div>
              </div>

              {/* Rating Chart */}
              <div style={{ marginBottom: "1.5rem" }}>
                <CourseSummaryChart summary={summary} />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
    </>
  );
}
