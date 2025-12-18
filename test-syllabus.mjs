import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// 載入環境變數
config({ path: '.env.local' });

const prisma = new PrismaClient();

async function addTestSyllabus() {
  try {
    // 找一個課程來測試
    const course = await prisma.course.findFirst({
      where: {
        year: '114',
        term: '1',
        courseName: {
          contains: '計算機概論'
        }
      },
      select: {
        id: true,
        courseName: true,
        selectCode: true,
        syllabusUrl: true
      }
    });

    if (!course) {
      console.log('找不到測試課程');
      return;
    }

    console.log('找到課程:', course);

    // 創建測試用的課程大綱數據
    const testSyllabusData = {
      courseName: '計算機概論',
      courseNameEn: 'Introduction to Computer Science',
      instructor: '測試教師',
      department: '電機工程系',
      credits: '3',
      requiredOrElective: '必修',
      grade: '一年級',
      prerequisites: '無',
      objectives: `本課程旨在培養學生對計算機科學的基本認識與理解，包括：
1. 了解計算機硬體架構與運作原理
2. 學習程式設計基本概念與邏輯思維
3. 認識作業系統、網路與資料庫等基礎知識
4. 培養資訊科技應用與問題解決能力
5. 建立資訊倫理與資訊安全的正確觀念`,
      outline: `第一週：計算機概論與發展史
第二週：數位系統與資料表示法
第三週：計算機硬體架構
第四週：中央處理器與記憶體
第五週：輸入輸出裝置
第六週：作業系統概論
第七週：程式語言基礎
第八週：演算法與資料結構
第九週：期中考試
第十週：資料庫系統
第十一週：網路通訊原理
第十二週：網際網路應用
第十三週：多媒體技術
第十四週：資訊安全
第十五週：人工智慧導論
第十六週：雲端運算與物聯網
第十七週：資訊倫理
第十八週：期末考試`,
      teachingMethod: `1. 課堂講授：運用投影片與實例說明各章節重點
2. 上機實習：透過實際操作加深理解
3. 分組討論：培養團隊合作與問題解決能力
4. 專題報告：訓練資料蒐集與口頭表達能力`,
      evaluation: `1. 平時成績（30%）：出席率、課堂參與、作業繳交
2. 期中考試（30%）：測驗前半學期學習成效
3. 期末考試（30%）：測驗後半學期學習成效
4. 專題報告（10%）：評量實作與表達能力`,
      textbooks: `1. 計算機概論（第八版），施威銘研究室著，旗標出版社
2. 電腦概論：探索資訊科技，陳會安著，碁峰資訊`,
      references: `1. Computer Science: An Overview (13th Edition), Glenn Brookshear
2. Introduction to Computing Systems, Yale Patt & Sanjay Patel
3. 資訊科學導論，李春雄著，全華圖書
4. ACM Digital Library (https://dl.acm.org/)
5. IEEE Xplore Digital Library (https://ieeexplore.ieee.org/)`
    };

    // 更新課程資料
    const updated = await prisma.course.update({
      where: { id: course.id },
      data: {
        syllabusData: testSyllabusData,
        syllabusUrl: 'https://webap.nkust.edu.tw/nkust/ag_pro/ag064_print.jsp?arg01=114&arg02=1&arg04=0464'
      }
    });

    console.log('\n✓ 成功添加測試課程大綱數據');
    console.log('課程 ID:', updated.id);
    console.log('課程名稱:', updated.courseName);
    console.log('\n請訪問以下網址查看效果:');
    console.log(`http://localhost:3000/courses/${updated.id}`);

  } catch (error) {
    console.error('錯誤:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestSyllabus();
