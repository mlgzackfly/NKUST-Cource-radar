#!/usr/bin/env node
/**
 * 修復搜尋建議功能
 *
 * 此腳本會：
 * 1. 檢查 searchVector 欄位和索引
 * 2. 創建觸發器（如果不存在）
 * 3. 填充現有數據的 searchVector
 *
 * 使用方法：
 * - 本地：npm run fix:search
 * - Zeabur：DATABASE_URL="..." node scripts/fix-search-vector.mjs
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config({ path: '.env.local' });

const prisma = new PrismaClient();

async function fixSearchVector() {
  try {
    console.log('🔧 開始修復搜尋向量...\n');

    // 1. 檢查連線
    console.log('1️⃣ 檢查資料庫連線...');
    await prisma.$connect();
    console.log('✓ 連線成功\n');

    // 2. 檢查課程數量
    const courseCount = await prisma.course.count();
    console.log(`2️⃣ 課程總數: ${courseCount}`);

    if (courseCount === 0) {
      console.log('⚠️  資料庫中沒有課程，無需修復\n');
      return;
    }

    // 3. 檢查有多少課程的 searchVector 是 NULL
    const result = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "Course"
      WHERE "searchVector" IS NULL
    `;
    const nullCount = Number(result[0].count);
    console.log(`   searchVector 為 NULL: ${nullCount} 筆`);

    if (nullCount === 0) {
      console.log('✓ 所有課程都已有 searchVector，無需修復\n');
      return;
    }

    console.log(`\n3️⃣ 需要修復 ${nullCount} 筆課程的 searchVector\n`);

    // 4. 創建觸發器函數
    console.log('4️⃣ 創建/更新觸發器函數...');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION course_search_trigger() RETURNS trigger AS $$
      BEGIN
        NEW."searchVector" :=
          setweight(to_tsvector('simple', coalesce(NEW."courseName", '')), 'A') ||
          setweight(to_tsvector('simple', coalesce(NEW."courseCode", '')), 'B') ||
          setweight(to_tsvector('simple', coalesce(NEW."selectCode", '')), 'B') ||
          setweight(to_tsvector('simple', coalesce(NEW."department", '')), 'C');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✓ 觸發器函數已創建\n');

    // 5. 創建觸發器
    console.log('5️⃣ 創建觸發器...');
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS course_search_update ON "Course";
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER course_search_update
        BEFORE INSERT OR UPDATE ON "Course"
        FOR EACH ROW
        EXECUTE FUNCTION course_search_trigger();
    `);
    console.log('✓ 觸發器已創建\n');

    // 6. 填充現有數據
    console.log('6️⃣ 填充現有課程的 searchVector...');
    console.log('   這可能需要幾秒到幾分鐘...');

    const startTime = Date.now();
    await prisma.$executeRawUnsafe(`
      UPDATE "Course" SET "updatedAt" = "updatedAt"
    `);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✓ 完成（耗時 ${duration} 秒）\n`);

    // 7. 確保索引存在
    console.log('7️⃣ 創建 GIN 索引...');
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "Course_searchVector_idx"
        ON "Course" USING GIN ("searchVector");
      `);
      console.log('✓ 索引已創建\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✓ 索引已存在\n');
      } else {
        throw error;
      }
    }

    // 8. 驗證修復結果
    console.log('8️⃣ 驗證修復結果...');
    const verifyResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "Course"
      WHERE "searchVector" IS NOT NULL
    `;
    const fixedCount = Number(verifyResult[0].count);
    console.log(`   searchVector 已填充: ${fixedCount} / ${courseCount} 筆\n`);

    if (fixedCount === courseCount) {
      console.log('✅ 修復完成！所有課程的 searchVector 都已正確設置\n');

      // 測試搜尋
      console.log('9️⃣ 測試搜尋功能...');
      const testResults = await prisma.$queryRaw`
        SELECT "courseName"
        FROM "Course"
        WHERE "searchVector" @@ plainto_tsquery('simple', '程式')
        LIMIT 3
      `;

      if (testResults.length > 0) {
        console.log('✓ 搜尋功能正常！範例結果：');
        testResults.forEach((r, i) => {
          console.log(`   ${i + 1}. ${r.courseName}`);
        });
      } else {
        console.log('⚠️  搜尋測試未返回結果（可能沒有相關課程）');
      }
    } else {
      console.log('⚠️  部分課程的 searchVector 未能填充');
      console.log('   請檢查資料庫日誌查看錯誤訊息');
    }

    console.log('\n✅ 修復腳本執行完成！');
    console.log('\n📝 後續步驟：');
    console.log('   1. 訪問網站首頁');
    console.log('   2. 在搜尋框輸入至少 2 個字');
    console.log('   3. 應該會看到搜尋建議下拉選單\n');

  } catch (error) {
    console.error('\n❌ 修復失敗:', error);
    console.error('\n💡 故障排除：');
    console.error('   1. 確認 DATABASE_URL 環境變數正確');
    console.error('   2. 確認有資料庫寫入權限');
    console.error('   3. 確認 PostgreSQL 版本 >= 12');
    console.error('   4. 檢查錯誤訊息了解具體問題\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixSearchVector();
