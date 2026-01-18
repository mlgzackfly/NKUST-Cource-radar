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

// 教師頁面動態 OG 圖片
export default async function Image({ params }: Props) {
  const { id } = await params;

  // 預設資料
  let instructorName = "教師詳情";
  let courseCount = 0;
  let reviewCount = 0;
  let avgRating = 0;
  let departments: string[] = [];

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
                  department: true,
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

        // 收集所有評價和系所
        const allReviews: { overallRating: number }[] = [];
        const deptSet = new Set<string>();

        instructor.courses.forEach((c: { course: { department: string | null; reviews: { overallRating: number }[] } }) => {
          if (c.course.department) {
            deptSet.add(c.course.department);
          }
          c.course.reviews.forEach((r: { overallRating: number }) => {
            allReviews.push(r);
          });
        });

        reviewCount = allReviews.length;
        departments = Array.from(deptSet).slice(0, 3);

        if (reviewCount > 0) {
          avgRating = allReviews.reduce((sum, r) => sum + r.overallRating, 0) / reviewCount;
        }
      }
    } catch (error) {
      console.error("Failed to fetch instructor for OG image:", error);
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
          background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #3d7ab5 100%)",
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
              "radial-gradient(circle at 10% 90%, rgba(255, 255, 255, 0.1) 0%, transparent 40%), radial-gradient(circle at 90% 10%, rgba(255, 255, 255, 0.1) 0%, transparent 40%)",
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

        {/* 教師圖示和名稱 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              background: "rgba(255, 255, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              marginRight: 24,
            }}
          >
            👨‍🏫
          </div>
          <div
            style={{
              fontSize: instructorName.length > 10 ? 48 : 56,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.02em",
              display: "flex",
            }}
          >
            {instructorName.length > 15 ? instructorName.slice(0, 15) + "..." : instructorName}
          </div>
        </div>

        {/* 系所資訊 */}
        {departments.length > 0 && (
          <div
            style={{
              fontSize: 24,
              color: "rgba(255, 255, 255, 0.8)",
              marginBottom: 16,
              display: "flex",
            }}
          >
            🏛️ {departments.join("、")}
          </div>
        )}

        {/* 課程統計 */}
        <div
          style={{
            fontSize: 22,
            color: "rgba(255, 255, 255, 0.7)",
            marginBottom: 32,
            display: "flex",
          }}
        >
          📚 {courseCount} 門課程
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
                {reviewCount} 則課程評價
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
              尚無課程評價
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
