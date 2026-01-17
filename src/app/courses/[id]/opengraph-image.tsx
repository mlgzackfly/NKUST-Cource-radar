import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";

// 圖片尺寸
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

type Props = {
  params: Promise<{ id: string }>;
};

// 課程頁面動態 OG 圖片
export default async function Image({ params }: Props) {
  const { id } = await params;

  // 預設資料
  let courseName = "課程詳情";
  let instructors = "高科選課雷達";
  let department = "";
  let credits = 0;
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
          credits: true,
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
        credits = course.credits || 0;
        reviewCount = course.reviews.length;
        if (reviewCount > 0) {
          avgRating =
            course.reviews.reduce((sum: number, r: { overallRating: number }) => sum + r.overallRating, 0) / reviewCount;
        }
      }
    } catch (error) {
      console.error("Failed to fetch course for OG image:", error);
    }
  }

  // 評分星星
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    let stars = "";
    for (let i = 0; i < fullStars; i++) stars += "★";
    if (hasHalf) stars += "☆";
    return stars || "尚無評分";
  };

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 60,
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
              "radial-gradient(circle at 10% 90%, rgba(120, 119, 198, 0.25) 0%, transparent 40%), radial-gradient(circle at 90% 10%, rgba(74, 144, 226, 0.25) 0%, transparent 40%)",
            display: "flex",
          }}
        />

        {/* 頂部品牌 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              marginRight: 14,
            }}
          >
            📡
          </div>
          <div
            style={{
              fontSize: 24,
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
            fontSize: courseName.length > 15 ? 48 : 56,
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.2,
            marginBottom: 24,
            letterSpacing: "-0.02em",
            display: "flex",
            maxWidth: "100%",
          }}
        >
          {courseName.length > 25 ? courseName.slice(0, 25) + "..." : courseName}
        </div>

        {/* 教師名稱 */}
        <div
          style={{
            fontSize: 32,
            color: "rgba(255, 255, 255, 0.9)",
            marginBottom: 16,
            display: "flex",
          }}
        >
          👨‍🏫 {instructors.length > 20 ? instructors.slice(0, 20) + "..." : instructors}
        </div>

        {/* 課程資訊 */}
        <div
          style={{
            display: "flex",
            gap: 24,
            marginBottom: 32,
          }}
        >
          {department && (
            <div
              style={{
                fontSize: 22,
                color: "rgba(255, 255, 255, 0.7)",
                display: "flex",
              }}
            >
              🏛️ {department}
            </div>
          )}
          {credits > 0 && (
            <div
              style={{
                fontSize: 22,
                color: "rgba(255, 255, 255, 0.7)",
                display: "flex",
              }}
            >
              📚 {credits} 學分
            </div>
          )}
        </div>

        {/* 底部評價資訊 */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            gap: 40,
          }}
        >
          {reviewCount > 0 && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 36,
                    color: "#fbbf24",
                    display: "flex",
                  }}
                >
                  {renderStars(avgRating)}
                </div>
                <div
                  style={{
                    fontSize: 28,
                    color: "rgba(255, 255, 255, 0.9)",
                    fontWeight: 700,
                    display: "flex",
                  }}
                >
                  {avgRating.toFixed(1)}
                </div>
              </div>
              <div
                style={{
                  fontSize: 22,
                  color: "rgba(255, 255, 255, 0.7)",
                  display: "flex",
                }}
              >
                {reviewCount} 則評價
              </div>
            </>
          )}
          {reviewCount === 0 && (
            <div
              style={{
                fontSize: 22,
                color: "rgba(255, 255, 255, 0.6)",
                display: "flex",
              }}
            >
              尚無評價，成為第一個評價的人！
            </div>
          )}
        </div>

        {/* 右下角網址 */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 60,
            fontSize: 18,
            color: "rgba(255, 255, 255, 0.4)",
            display: "flex",
          }}
        >
          nkust-course.zeabur.app
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
