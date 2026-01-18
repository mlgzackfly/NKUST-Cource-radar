import { prisma } from "@/lib/db";

type SitemapEntry = {
  url: string;
  lastModified?: Date;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

export default async function sitemap(): Promise<SitemapEntry[]> {
  const baseUrl = process.env.NEXTAUTH_URL || "https://nkust.zeabur.app";

  // 靜態頁面
  const staticPages: SitemapEntry[] = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/courses`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/mock-schedule`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/cookies`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // 動態課程頁面（只取最近學期的課程，避免 sitemap 過大）
  let coursePages: SitemapEntry[] = [];

  if (prisma) {
    try {
      // 取得最近 2 個學期的課程
      const recentCourses = await prisma.course.findMany({
        select: {
          id: true,
          updatedAt: true,
        },
        orderBy: [{ year: "desc" }, { term: "desc" }],
        take: 5000, // 限制數量避免 sitemap 過大
      });

      coursePages = recentCourses.map((course: { id: string; updatedAt: Date }) => ({
        url: `${baseUrl}/courses/${course.id}`,
        lastModified: course.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    } catch (error) {
      console.error("Failed to fetch courses for sitemap:", error);
    }
  }

  // 教師頁面
  let instructorPages: SitemapEntry[] = [];

  if (prisma) {
    try {
      const instructors = await prisma.instructor.findMany({
        select: {
          id: true,
        },
        take: 2000,
      });

      instructorPages = instructors.map((instructor: { id: string }) => ({
        url: `${baseUrl}/instructors/${instructor.id}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
    } catch (error) {
      console.error("Failed to fetch instructors for sitemap:", error);
    }
  }

  return [...staticPages, ...coursePages, ...instructorPages];
}
