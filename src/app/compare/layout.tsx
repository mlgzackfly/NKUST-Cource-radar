import type { ReactNode } from "react";
// @ts-expect-error - Next.js 15.5.9 type definition issue
import type { Metadata } from "next";

const baseUrl = process.env.NEXTAUTH_URL || "https://nkust.zeabur.app";

export const metadata: Metadata = {
  title: "課程比較",
  description:
    "比較高雄科技大學不同課程的評價、涼度指數、給分甜度等資訊，幫助你在多門課之間做出最佳選擇。",
  openGraph: {
    title: "課程比較 | 高科選課雷達",
    description: "比較高科大不同課程的評價與評分，做出最佳選課決定。",
    url: `${baseUrl}/compare`,
    siteName: "高科選課雷達",
    locale: "zh_TW",
    type: "website",
  },
  alternates: {
    canonical: `${baseUrl}/compare`,
  },
};

export default function CompareLayout({ children }: { children: ReactNode }) {
  return children;
}
