import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Sync course data from GitHub Pages Static API to PostgreSQL
 *
 * Usage:
 * POST /api/sync/courses
 * Headers: Authorization: Bearer YOUR_ADMIN_SECRET
 * Body: { "apiUrl": "https://username.github.io/nkust/api" } (optional)
 */

type Course = {
  id: string;
  year: string;
  term: string;
  semester: string;
  courseName: string;
  selectCode: string | null;
  courseCode: string | null;
  credits: number | null;
  campus: string | null;
  division: string | null;
  department: string | null;
  requiredOrElective: string | null;
  className: string | null;
  combinedClassName: string | null;
  time: string | null;
  classroom: string | null;
  instructors: Array<{ name: string }>;
  enrolled: number | null;
  capacity: number | null;
  englishTaught: string | null;
  distanceLearning: string | null;
  note: string | null;
  lectureHours: number | null;
  labHours: number | null;
};

export async function POST(request: NextRequest) {
  try {
    // 1. Check authorization
    const authHeader = request.headers.get("authorization");
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret) {
      return NextResponse.json(
        { error: "Admin functionality not configured" },
        { status: 503 }
      );
    }

    if (authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Get API URL
    const body = await request.json().catch(() => ({}));
    const apiUrl = body.apiUrl || process.env.STATIC_API_URL || "https://mlgzackfly.github.io/nkust/api";

    console.log(`🔄 Syncing courses from: ${apiUrl}`);

    // 3. Fetch courses from static API
    const response = await fetch(`${apiUrl}/courses.json`, {
      next: { revalidate: 0 } // 不使用快取
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch API: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const courseSummaries = data.courses || [];

    console.log(`📚 Found ${courseSummaries.length} courses`);

    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    // 4. Fetch and sync each course
    for (const summary of courseSummaries) {
      try {
        // 取得完整課程資料
        const courseResponse = await fetch(`${apiUrl}/courses/${summary.id}.json`);

        if (!courseResponse.ok) {
          console.warn(`⚠️  Failed to fetch course ${summary.id}`);
          errorCount++;
          continue;
        }

        const course: Course = await courseResponse.json();

        // Upsert course
        const result = await prisma.course.upsert({
          where: {
            id: course.id
          },
          create: {
            id: course.id,
            year: course.year,
            term: course.term,
            courseName: course.courseName,
            selectCode: course.selectCode,
            courseCode: course.courseCode,
            credits: course.credits,
            campus: course.campus,
            division: course.division,
            department: course.department,
            requiredOrElective: course.requiredOrElective,
            className: course.className,
            combinedClassName: course.combinedClassName,
            time: course.time,
            classroom: course.classroom,
            enrolled: course.enrolled,
            capacity: course.capacity,
            englishTaught: course.englishTaught,
            distanceLearning: course.distanceLearning,
            note: course.note,
            lectureHours: course.lectureHours,
            labHours: course.labHours,
            unitId: null,
          },
          update: {
            courseName: course.courseName,
            credits: course.credits,
            campus: course.campus,
            division: course.division,
            department: course.department,
            requiredOrElective: course.requiredOrElective,
            className: course.className,
            combinedClassName: course.combinedClassName,
            time: course.time,
            classroom: course.classroom,
            enrolled: course.enrolled,
            capacity: course.capacity,
            englishTaught: course.englishTaught,
            distanceLearning: course.distanceLearning,
            note: course.note,
            lectureHours: course.lectureHours,
            labHours: course.labHours,
          }
        });

        // 判斷是新增還是更新
        const isNew = result.createdAt.getTime() === result.updatedAt.getTime();
        if (isNew) {
          createdCount++;
        } else {
          updatedCount++;
        }

        // Sync instructors
        if (course.instructors && course.instructors.length > 0) {
          // 刪除舊的關聯
          await prisma.courseInstructor.deleteMany({
            where: { courseId: course.id }
          });

          // 建立新的關聯
          for (const inst of course.instructors) {
            // 建立或取得教師
            const instructor = await prisma.instructor.upsert({
              where: { name: inst.name },
              create: { name: inst.name },
              update: {}
            });

            // 建立課程-教師關聯
            await prisma.courseInstructor.create({
              data: {
                courseId: course.id,
                instructorId: instructor.id
              }
            });
          }
        }

        // 每 100 筆輸出進度
        if ((createdCount + updatedCount) % 100 === 0) {
          console.log(`📝 Progress: ${createdCount + updatedCount}/${courseSummaries.length}`);
        }

      } catch (error) {
        console.error(`❌ Error syncing course ${summary.id}:`, error);
        errorCount++;
      }
    }

    // 5. Update full-text search vectors
    console.log('🔍 Updating search vectors...');
    await prisma.$executeRaw`
      UPDATE "Course"
      SET "searchVector" =
        to_tsvector('simple',
          coalesce("courseName", '') || ' ' ||
          coalesce("selectCode", '') || ' ' ||
          coalesce("courseCode", '') || ' ' ||
          coalesce("department", '')
        )
    `;

    console.log('✅ Sync completed!');

    return NextResponse.json({
      success: true,
      statistics: {
        total: courseSummaries.length,
        created: createdCount,
        updated: updatedCount,
        errors: errorCount
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Sync failed:', error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
