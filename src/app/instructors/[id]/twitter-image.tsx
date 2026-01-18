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

// 教師頁面 Twitter 圖片
export default async function Image({ params }: Props) {
  const { id } = await params;

  // 預設資料
  let instructorName = "教師詳情";
  let courseCount = 0;
  let reviewCount = 0;
  let avgRating = 0;

  // 嘗試從資料庫取得教師資訊
  if (prisma) {
    try {
      const instructor = await prisma.instructor.findUnique({
        where: { id },
        select: {
          name: true,
          courses: {
            select: {
              course: {
                select: {
                  reviews: {
                    where: { status: "ACTIVE" },
                    select: {
                      overallRating: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (instructor) {
        instructorName = instructor.name;
        courseCount = instructor.courses.length;

        // 收集所有評價
        const allReviews: { overallRating: number }[] = [];
        instructor.courses.forEach((c: { course: { reviews: { overallRating: number }[] } }) => {
          c.course.reviews.forEach((r: { overallRating: number }) => {
            allReviews.push(r);
          });
        });

        reviewCount = allReviews.length;
        if (reviewCount > 0) {
          avgRating = allReviews.reduce((sum, r) => sum + r.overallRating, 0) / reviewCount;
        }
      }
    } catch (error) {
      console.error("Failed to fetch instructor for Twitter image:", error);
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #3d7ab5 100%)",
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
              "radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 40%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 40%)",
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

        {/* 教師圖示和名稱 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              background: "rgba(255, 255, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              marginRight: 16,
            }}
          >
            👨‍🏫
          </div>
          <div
            style={{
              fontSize: instructorName.length > 10 ? 40 : 48,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.02em",
              display: "flex",
            }}
          >
            {instructorName.length > 15 ? instructorName.slice(0, 15) + "..." : instructorName}
          </div>
        </div>

        {/* 課程統計 */}
        <div
          style={{
            fontSize: 22,
            color: "rgba(255, 255, 255, 0.8)",
            marginBottom: 16,
            display: "flex",
          }}
        >
          {courseCount} 門課程
        </div>

        {/* 評價資訊 */}
        {reviewCount > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
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
