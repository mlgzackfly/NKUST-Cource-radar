import { prisma } from "@/lib/db";
import { ScheduleLayout } from "@/components/MockSchedule/ScheduleLayout";
import type { CourseForSelection } from "@/types/mockSchedule";
// @ts-expect-error - Next.js 15.5.9 type definition issue
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "模擬選課 - 高科選課雷達",
  description: "無需登入，快速模擬規劃課表，檢測衝堂並匯出分享",
};

type PageProps = {
  searchParams?: Promise<{
    courses?: string;
    year?: string;
    term?: string;
  }>;
};

export default async function MockSchedulePage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const courseIds = sp.courses?.split(",").filter(Boolean) || [];
  const sharedYear = sp.year;
  const sharedTerm = sp.term;

  // 若有分享連結參數，從資料庫預載入課程資料
  let sharedCourses: CourseForSelection[] = [];

  if (courseIds.length > 0 && prisma) {
    try {
      const courses = await prisma.course.findMany({
        where: { id: { in: courseIds } },
        select: {
          id: true,
          courseName: true,
          credits: true,
          time: true,
          department: true,
          year: true,
          term: true,
          classroom: true,
          instructors: {
            select: {
              instructor: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // 扁平化 instructors 結構以符合 CourseForSelection 型別
      sharedCourses = (courses as any[]).map((c: any) => ({
        ...c,
        instructors: (c.instructors as any[]).map((x: any) => x.instructor),
      }));
    } catch (error) {
      console.error("載入分享課程失敗:", error);
    }
  }

  return (
    <div className="app-container" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
      {/* 頁面標題 */}
      <div className="ts-box is-raised" style={{ marginBottom: "2rem" }}>
        <div className="ts-content" style={{ padding: "2rem" }}>
          <div
            className="ts-header is-large"
            style={{ fontSize: "1.875rem", fontWeight: 700, marginBottom: "0.75rem" }}
          >
            模擬選課
          </div>
          <div className="app-muted" style={{ fontSize: "1.0625rem", lineHeight: 1.7 }}>
            無需登入，快速規劃課表、檢測衝堂，並匯出或分享給朋友。
            <br />
            <span style={{ fontSize: "0.9375rem", color: "var(--ts-gray-500)" }}>
              ⚠️ 注意：此為模擬工具，實際選課請至學校選課系統操作
            </span>
          </div>
        </div>
      </div>

      {/* 主要內容區 */}
      <ScheduleLayout
        initialCourses={sharedCourses}
        initialSemester={
          sharedYear && sharedTerm
            ? { year: sharedYear, term: sharedTerm }
            : undefined
        }
      />
    </div>
  );
}
