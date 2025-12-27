import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireNkustUser } from "@/lib/auth";
import { rateLimiter } from "@/lib/ratelimit";
import { getCourseRatingSummary } from "@/lib/reviewSummary";

// POST /api/favorites - 新增收藏
export async function POST(request: NextRequest) {
  try {
    // 檢查使用者是否已登入且為高科大學生
    const user = await requireNkustUser();

    // Rate limiting
    const rateLimitKey = `favorite:${user.id}`;
    const rateLimit = rateLimiter.check(rateLimitKey, 10, 60 * 1000);

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "操作太頻繁，請稍後再試" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)),
          },
        }
      );
    }

    // 解析 request body
    const body = await request.json();
    const { courseId } = body;

    // 驗證課程 ID
    if (!courseId || typeof courseId !== "string") {
      return NextResponse.json(
        { error: "課程 ID 不可為空" },
        { status: 400 }
      );
    }

    // 檢查課程是否存在
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json({ error: "課程不存在" }, { status: 404 });
    }

    // 建立收藏（使用 create，若已存在則會拋出錯誤）
    try {
      const favorite = await prisma.favorite.create({
        data: {
          userId: user.id,
          courseId,
        },
      });

      return NextResponse.json(
        {
          success: true,
          favoriteId: favorite.id,
        },
        { status: 201 }
      );
    } catch (error: any) {
      // P2002 是 Prisma 的 unique constraint violation 錯誤
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "已經收藏過此課程" },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Error creating favorite:", error);
    return NextResponse.json(
      { error: "新增收藏失敗，請稍後再試" },
      { status: 500 }
    );
  }
}

// GET /api/favorites - 取得收藏列表
export async function GET(request: NextRequest) {
  try {
    // 檢查使用者是否已登入且為高科大學生
    const user = await requireNkustUser();

    // 解析查詢參數
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get("year");
    const term = searchParams.get("term");
    const sort = searchParams.get("sort") || "latest"; // latest | oldest | name

    // 建立查詢條件
    const where: any = {
      userId: user.id,
    };

    // 篩選條件
    const courseWhere: any = {};
    if (year) courseWhere.year = year;
    if (term) courseWhere.term = term;

    // 排序方式
    let orderBy: any;
    switch (sort) {
      case "oldest":
        orderBy = { createdAt: "asc" };
        break;
      case "name":
        orderBy = { course: { courseName: "asc" } };
        break;
      case "latest":
      default:
        orderBy = { createdAt: "desc" };
    }

    // 查詢收藏列表
    const favorites = await prisma.favorite.findMany({
      where: {
        ...where,
        ...(Object.keys(courseWhere).length > 0 && { course: courseWhere }),
      },
      orderBy,
      include: {
        course: {
          include: {
            instructors: {
              include: {
                instructor: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 格式化回傳資料
    const formattedFavorites = await Promise.all(
      favorites.map(async (favorite) => {
        const course = favorite.course;

        // 取得評分摘要
        const summary = await getCourseRatingSummary(course.id);

        return {
          id: favorite.id,
          createdAt: favorite.createdAt.toISOString(),
          course: {
            id: course.id,
            courseName: course.courseName,
            courseCode: course.courseCode,
            year: course.year,
            term: course.term,
            credits: course.credits,
            time: course.time,
            classroom: course.classroom,
            instructors: course.instructors.map((ci) => ({
              id: ci.instructor.id,
              name: ci.instructor.name,
            })),
            summary,
          },
        };
      })
    );

    return NextResponse.json({
      favorites: formattedFavorites,
    });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { error: "取得收藏列表失敗，請稍後再試" },
      { status: 500 }
    );
  }
}
