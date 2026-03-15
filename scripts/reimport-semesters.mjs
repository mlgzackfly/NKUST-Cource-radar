#!/usr/bin/env node
/**
 * 刪除指定學期的課程資料並重新匯入
 * 用於修復不完整的匯入
 *
 * 環境變數:
 * - REIMPORT_SEMESTERS: 要重新匯入的學期，格式 "109-2,110-1"
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function main() {
  const semestersStr = process.env.REIMPORT_SEMESTERS || '';
  if (!semestersStr) {
    console.error('請設定 REIMPORT_SEMESTERS 環境變數，例如: "109-2,110-1"');
    process.exit(1);
  }

  const semesters = semestersStr.split(',').map(s => {
    const [year, term] = s.trim().split('-');
    return { year, term };
  });

  console.log('🗑️  開始刪除並重新匯入以下學期:', semestersStr);
  console.log('');

  for (const { year, term } of semesters) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📚 處理 ${year} 學年度第 ${term} 學期`);
    console.log('='.repeat(50));

    // 1. 刪除舊資料
    console.log('\n🗑️  刪除舊資料...');

    // 刪除 CourseInstructor 關聯
    const deletedCI = await prisma.courseInstructor.deleteMany({
      where: { course: { year, term } }
    });
    console.log(`   刪除 CourseInstructor: ${deletedCI.count} 筆`);

    // 刪除課程
    const deletedCourses = await prisma.course.deleteMany({
      where: { year, term }
    });
    console.log(`   刪除 Course: ${deletedCourses.count} 筆`);

    // 2. 重新爬取
    console.log('\n🕷️  開始爬取...');
    try {
      execSync(`npm run scrape:nkust-stdsys`, {
        stdio: 'inherit',
        env: {
          ...process.env,
          NKUST_YEAR: year,
          NKUST_TERM: term,
        }
      });
    } catch (e) {
      console.error('❌ 爬取失敗');
      continue;
    }

    // 3. 重新匯入
    console.log('\n💾 開始匯入...');
    try {
      execSync(`npm run db:import:nkust-stdsys`, {
        stdio: 'inherit',
        env: {
          ...process.env,
          NKUST_IMPORT_YEAR: year,
          NKUST_IMPORT_TERM: term,
        }
      });
    } catch (e) {
      console.error('❌ 匯入失敗');
      continue;
    }

    // 4. 驗證
    const newCount = await prisma.course.count({
      where: { year, term }
    });
    console.log(`\n✅ 完成！新課程數: ${newCount}`);
  }

  // 最終統計
  console.log('\n' + '='.repeat(50));
  console.log('📊 最終統計');
  console.log('='.repeat(50));

  const total = await prisma.course.count();
  const instructors = await prisma.instructor.count();
  console.log(`課程總數: ${total}`);
  console.log(`教師總數: ${instructors}`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
