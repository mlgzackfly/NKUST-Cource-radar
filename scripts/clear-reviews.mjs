import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// 載入環境變數
config({ path: '.env.local' });

const prisma = new PrismaClient();

async function clearAllReviews() {
  try {
    console.log('🗑️  開始清除所有評論資料...\n');

    // 刪除所有評論相關資料
    const [commentsDeleted, votesDeleted, reviewsDeleted] = await Promise.all([
      prisma.comment.deleteMany(),
      prisma.helpfulVote.deleteMany(),
      prisma.review.deleteMany(),
    ]);

    console.log('✓ 已刪除評論留言:', commentsDeleted.count);
    console.log('✓ 已刪除有幫助投票:', votesDeleted.count);
    console.log('✓ 已刪除評論:', reviewsDeleted.count);
    console.log('\n✅ 所有評論資料已清除完成！');

  } catch (error) {
    console.error('❌ 錯誤:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllReviews();
