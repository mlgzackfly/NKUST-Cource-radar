import type { ReactNode } from "react";
// @ts-expect-error - Next.js 15.5.9 type definition issue
import type { Metadata } from "next";

const baseUrl = process.env.NEXTAUTH_URL || "https://nkust.zeabur.app";

type Props = {
  params: Promise<{ name: string }>;
  children: ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  const title = `${decodedName} 系所統計`;
  const description = `查看高雄科技大學 ${decodedName} 的課程統計、評價趨勢、熱門教師與熱門課程分析。`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | 高科選課雷達`,
      description,
      url: `${baseUrl}/departments/${name}`,
      siteName: "高科選課雷達",
      locale: "zh_TW",
      type: "website",
    },
    alternates: {
      canonical: `${baseUrl}/departments/${name}`,
    },
  };
}

export default function DepartmentLayout({ children }: Props) {
  return children;
}
