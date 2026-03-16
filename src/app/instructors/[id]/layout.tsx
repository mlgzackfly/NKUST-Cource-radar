import type { ReactNode } from "react";
// @ts-expect-error - Next.js 15.5.9 type definition issue
import type { Metadata } from "next";
import { prisma } from "@/lib/db";

const baseUrl = process.env.NEXTAUTH_URL || "https://nkust.zeabur.app";

type Props = {
  params: Promise<{ id: string }>;
  children: ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  if (!prisma) {
    return { title: "教師資訊" };
  }

  try {
    const instructor = await prisma.instructor.findUnique({
      where: { id },
      select: {
        name: true,
        courses: {
          select: {
            course: { select: { department: true } },
          },
          take: 1,
        },
      },
    });

    if (!instructor) {
      return { title: "找不到教師" };
    }

    const department = instructor.courses[0]?.course?.department;
    const title = `${instructor.name} 教師評價`;
    const description = `查看高雄科技大學${department ? ` ${department}` : ""} ${instructor.name} 老師的課程評價、評分統計與開課資訊。`;

    return {
      title,
      description,
      openGraph: {
        title: `${title} | 高科選課雷達`,
        description,
        url: `${baseUrl}/instructors/${id}`,
        siteName: "高科選課雷達",
        locale: "zh_TW",
        type: "profile",
      },
      alternates: {
        canonical: `${baseUrl}/instructors/${id}`,
      },
    };
  } catch {
    return { title: "教師資訊" };
  }
}

export default function InstructorLayout({ children }: Props) {
  return children;
}
