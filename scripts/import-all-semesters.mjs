#!/usr/bin/env node
/**
 * 匯入多個學期的課程數據
 *
 * 使用方法：
 * 1. 設置環境變數（在 .env.local 中配置資料庫連線）
 * 2. 執行：node scripts/import-all-semesters.mjs
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

// 載入環境變數
config({ path: '.env.local' });

const prisma = new PrismaClient();

// 要匯入的學期列表（學年#學期）
const SEMESTERS = [
  { year: '113', term: '1', label: '113 學年度第 1 學期' },
  { year: '113', term: '2', label: '113 學年度第 2 學期' },
  { year: '114', term: '1', label: '114 學年度第 1 學期' },
  // 可以繼續添加更多學期
];

async function importAllSemesters() {
  try {
    console.log('🚀 開始匯入多個學期的課程數據...\n');

    // 檢查資料庫連線
    console.log('📡 檢查資料庫連線...');
    await prisma.$connect();
    console.log('✓ 資料庫連線成功\n');

    const initialCount = await prisma.course.count();
    console.log(`📊 當前課程總數: ${initialCount}\n`);

    for (const semester of SEMESTERS) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📚 處理 ${semester.label}`);
      console.log('='.repeat(60));

      // 檢查該學期是否已有數據
      const existingCount = await prisma.course.count({
        where: {
          year: semester.year,
          term: semester.term,
        },
      });

      if (existingCount > 0) {
        console.log(`⚠️  該學期已有 ${existingCount} 筆課程，跳過\n`);
        continue;
      }

      console.log('\n1️⃣ 爬取課程數據...');
      console.log('   這可能需要 30-60 分鐘，請耐心等待...\n');

      const env = {
        ...process.env,
        NKUST_IMPORT_YEAR: semester.year,
        NKUST_IMPORT_TERM: semester.term,
        NKUST_SCRAPE_SYLLABUS: '0', // 不爬取課程大綱（太慢）
      };

      try {
        // 執行爬蟲
        execSync('npm run scrape:nkust-ag202', {
          stdio: 'inherit',
          env,
        });

        console.log('\n2️⃣ 匯入資料庫...');
        execSync('npm run db:import:nkust-ag202', {
          stdio: 'inherit',
          env,
        });

        // 確認匯入結果
        const newCount = await prisma.course.count({
          where: {
            year: semester.year,
            term: semester.term,
          },
        });

        console.log(`\n✅ ${semester.label} 匯入完成！`);
        console.log(`   新增課程: ${newCount}\n`);
      } catch (error) {
        console.error(`\n❌ ${semester.label} 匯入失敗:`, error.message);
        console.log('   繼續處理下一個學期...\n');
        continue;
      }
    }

    // 最終統計
    const finalCount = await prisma.course.count();
    const instructorCount = await prisma.instructor.count();

    console.log('\n' + '='.repeat(60));
    console.log('🎉 所有學期匯入完成！');
    console.log('='.repeat(60));
    console.log(`課程總數: ${finalCount} (新增 ${finalCount - initialCount})`);
    console.log(`教師總數: ${instructorCount}\n`);

    // 按學期統計
    console.log('📊 各學期課程數量:');
    for (const semester of SEMESTERS) {
      const count = await prisma.course.count({
        where: {
          year: semester.year,
          term: semester.term,
        },
      });
      console.log(`   ${semester.label}: ${count}`);
    }
    console.log('');

  } catch (error) {
    console.error('\n❌ 匯入失敗:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 執行
importAllSemesters();
