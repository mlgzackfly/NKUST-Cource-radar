#!/usr/bin/env node
/**
 * 檢查資料庫中的課程數據
 * 用於驗證 GitHub Actions 是否成功匯入數據
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config({ path: '.env.local' });

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 正在檢查資料庫...\n');

    // 檢查連線
    await prisma.$connect();
    console.log('✅ 資料庫連線成功\n');

    // 查詢總數
    const totalCourses = await prisma.course.count();
    const totalInstructors = await prisma.instructor.count();

    console.log('📊 資料庫統計:');
    console.log(`   課程總數: ${totalCourses}`);
    console.log(`   教師總數: ${totalInstructors}\n`);

    if (totalCourses === 0) {
      console.log('⚠️  資料庫中沒有課程數據！');
      console.log('   請使用 GitHub Actions 或本地腳本匯入數據\n');
      return;
    }

    // 按學期統計
    console.log('📚 各學期課程數量:');
    const semesters = await prisma.course.groupBy({
      by: ['year', 'term'],
      _count: {
        id: true,
      },
      orderBy: [
        { year: 'desc' },
        { term: 'desc' },
      ],
    });

    semesters.forEach((sem) => {
      console.log(`   ${sem.year} 學年度第 ${sem.term} 學期: ${sem._count.id} 筆`);
    });

    console.log('\n✅ 資料庫檢查完成！');
    console.log('   您的 Zeabur 應用會直接從這個資料庫讀取數據\n');

  } catch (error) {
    console.error('\n❌ 檢查失敗:', error.message);

    if (error.message.includes('connect')) {
      console.log('\n💡 提示: 請確認 DATABASE_URL 環境變數是否正確設置');
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
