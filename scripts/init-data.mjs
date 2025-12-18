#!/usr/bin/env node
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

// 載入環境變數
config({ path: '.env.local' });

const prisma = new PrismaClient();

async function initData() {
  try {
    console.log('🚀 開始初始化資料...\n');

    // 檢查資料庫連線
    console.log('1️⃣ 檢查資料庫連線...');
    await prisma.$connect();
    console.log('✓ 資料庫連線成功\n');

    // 檢查是否已有資料
    const courseCount = await prisma.course.count();
    console.log(`2️⃣ 目前課程數量: ${courseCount}`);

    if (courseCount > 0) {
      console.log('⚠️  資料庫已有課程資料，跳過初始化');
      console.log('   如需重新匯入，請先清空資料庫\n');
      return;
    }

    console.log('\n3️⃣ 開始爬取課程資料...');
    console.log('   這可能需要 30-60 分鐘，請耐心等待...\n');

    // 設定環境變數並執行爬蟲
    const env = {
      ...process.env,
      NKUST_IMPORT_YEAR: '114',
      NKUST_IMPORT_TERM: '1',
      NKUST_SCRAPE_SYLLABUS: '0', // 初始部署不爬取課程大綱（太慢）
    };

    // 執行爬蟲和匯入
    console.log('   爬取 114 學年度第 1 學期課程...');
    execSync('npm run scrape:nkust-ag202', {
      stdio: 'inherit',
      env,
    });

    console.log('\n4️⃣ 開始匯入資料庫...');
    execSync('npm run db:import:nkust-ag202', {
      stdio: 'inherit',
      env,
    });

    // 確認匯入結果
    const finalCount = await prisma.course.count();
    const instructorCount = await prisma.instructor.count();

    console.log('\n✅ 資料初始化完成！');
    console.log(`   課程數量: ${finalCount}`);
    console.log(`   教師數量: ${instructorCount}\n`);

  } catch (error) {
    console.error('\n❌ 初始化失敗:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 如果是直接執行（非 import）
if (import.meta.url === `file://${process.argv[1]}`) {
  initData();
}

export default initData;
