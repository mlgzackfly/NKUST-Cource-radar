import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";

// Twitter 圖片尺寸 (2:1 比例)
export const size = {
  width: 1200,
  height: 600,
};

export const contentType = "image/png";

type Props = {
  params: Promise<{ id: string }>;
};

// 課程頁面 Twitter 圖片
export default async function Image({ params }: Props) {
  const { id } = await params;

  // 預設資料
  let courseName = "課程詳情";
  let instructors = "高科選課雷達";
  let department = "";
  let reviewCount = 0;
  let avgRating = 0;

  // 嘗試從資料庫取得課程資訊
  if (prisma) {
    try {
      const course = await prisma.course.findUnique({
        where: { id },
        select: {
          courseName: true,
          department: true,
          instructors: {
            select: {
              instructor: { select: { name: true } },
            },
          },
          reviews: {
            where: { status: "ACTIVE" },
            select: {
              overallRating: true,
            },
          },
        },
      });

      if (course) {
        courseName = course.courseName;
        instructors = course.instructors.map((i: { instructor: { name: string } }) => i.instructor.name).join("、") || "未知教師";
        department = course.department || "";
        reviewCount = course.reviews.length;
        if (reviewCount > 0) {
          avgRating =
            course.reviews.reduce((sum: number, r: { overallRating: number }) => sum + r.overallRating, 0) / reviewCount;
        }
      }
    } catch (error) {
      console.error("Failed to fetch course for Twitter image:", error);
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* 背景裝飾 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.25) 0%, transparent 40%), radial-gradient(circle at 80% 20%, rgba(74, 144, 226, 0.25) 0%, transparent 40%)",
            display: "flex",
          }}
        />

        {/* 頂部品牌 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              marginRight: 12,
            }}
          >
            📡
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: "rgba(255, 255, 255, 0.8)",
            }}
          >
            高科選課雷達
          </div>
        </div>

        {/* 課程名稱 */}
        <div
          style={{
            fontSize: courseName.length > 15 ? 40 : 48,
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: 16,
            letterSpacing: "-0.02em",
            display: "flex",
          }}
        >
          {courseName.length > 25 ? courseName.slice(0, 25) + "..." : courseName}
        </div>

        {/* 教師名稱 */}
        <div
          style={{
            fontSize: 26,
            color: "rgba(255, 255, 255, 0.9)",
            marginBottom: 12,
            display: "flex",
          }}
        >
          {instructors.length > 25 ? instructors.slice(0, 25) + "..." : instructors}
        </div>

        {/* 評價資訊 */}
        {reviewCount > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 8,
            }}
          >
            <div
              style={{
                fontSize: 28,
                color: "#fbbf24",
                fontWeight: 700,
                display: "flex",
              }}
            >
              ★ {avgRating.toFixed(1)}
            </div>
            <div
              style={{
                fontSize: 20,
                color: "rgba(255, 255, 255, 0.7)",
                display: "flex",
              }}
            >
              {reviewCount} 則評價
            </div>
          </div>
        )}
      </div>
    ),
    {
      ...size,
    }
  );
}
