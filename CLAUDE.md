# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

高科選課雷達 (NKUST Course Review) - 一個提供高雄科技大學課程查詢與匿名評價的 Web 應用程式。

**技術棧**：
- Next.js 15 (App Router) + React 19
- PostgreSQL + Prisma ORM
- NextAuth.js (email-based authentication, 限 @nkust.edu.tw)
- Tocas UI + CSS Modules
- ECharts (雷達圖)
- Resend (郵件服務)
- Zeabur (部署平台)

## 常用指令

### 開發環境
```bash
npm run dev              # 啟動開發伺服器 (http://localhost:3000)
npm run build            # 建置 production build
npm run start            # 執行 production server
```

### 資料庫操作
```bash
npx prisma generate      # 產生 Prisma Client
npx prisma migrate dev   # 執行 migration (開發環境)
npx prisma migrate deploy # 執行 migration (生產環境)
npm run db:check         # 檢查資料庫連線與基本狀態
npm run fix:search       # 修復全文搜尋 vector (若搜尋異常)
```

### 資料抓取與匯入
```bash
# 抓取課程資料 (存至 data/nkust/ag202/)
NKUST_AG202_YMS_YMS="114#1" npm run scrape:nkust-ag202

# 匯入至資料庫
NKUST_IMPORT_YEAR="114" NKUST_IMPORT_TERM="1" npm run db:import:nkust-ag202

# 批次匯入多個學期
node scripts/import-all-semesters.mjs

# 抓取課綱資料 (選用)
NKUST_SCRAPE_SYLLABUS=1 NKUST_AG202_YMS_YMS="114#1" npm run scrape:nkust-ag202
```

### 其他工具
```bash
npm run check-env        # 檢查環境變數是否正確設定
npm run test:email       # 測試郵件發送
npm run init-data        # 初始化測試資料
node scripts/clear-reviews.mjs  # 清除所有評論 (危險操作)
```

## 系統架構重點

### 資料流架構

1. **課程資料來源**：
   - 從高科大 `webap.nkust.edu.tw/nkust/ag_pro/ag202.jsp` 抓取
   - 儲存至 `data/nkust/ag202/{year}/{term}/{campus}/{degree}/{unit}.json`
   - 透過 `scripts/db/import-nkust-ag202.mjs` 匯入 PostgreSQL
   - **重要**：Web 端一律從資料庫查詢，不讀 JSON 檔案

2. **評價系統**：
   - 每位使用者對每門課程只能有一則評價 (unique constraint)
   - 評價允許編輯，編輯記錄保存至 `ReviewVersion`
   - 評價完全匿名顯示 (不回傳 user 識別資訊)
   - **權限分級**：
     - 未登入：只能看評分摘要（雷達圖、平均分）
     - 已登入 @nkust.edu.tw：可查看文字評論內容、發布評價
   - **尚未實作的功能**：留言 (Comment)、按「有幫助」(HelpfulVote)、檢舉 (Report) 等互動功能後續推出

3. **全文搜尋**：
   - Course 表有 `searchVector` 欄位 (tsvector type)
   - 由 PostgreSQL trigger 自動維護
   - 支援課程名稱、課程代碼、教師姓名搜尋

### Prisma Schema 關鍵設計

**核心 Models**：
- `Course`：課程主體，包含 `sourceKey` (唯一索引，用於 idempotent import)
- `Instructor`：教師 (name unique)
- `CourseInstructor`：課程-教師多對多關聯
- `Review`：評價 (unique constraint on userId + courseId) ✓ 已實作
- `ReviewVersion`：評價編輯歷史 ✓ 已實作
- `HelpfulVote`：有幫助投票 (Schema 已定義，功能尚未實作)
- `Comment`：留言 (Schema 已定義，功能尚未實作)
- `Report`：檢舉 (Schema 已定義，功能尚未實作)
- `AdminAction`：管理員操作記錄 (Schema 已定義，功能尚未實作)

**NextAuth Models**：
- `User`, `Account`, `Session`, `VerificationToken`

### 認證系統 (NextAuth)

- **Email Provider** (Resend)
- **限制**：只允許 `@nkust.edu.tw` 信箱
- **Email 正規化**：本地部分轉大寫 (C109193108@nkust.edu.tw)
- **Session**：database strategy，7天有效期
- **設定檔**：`src/pages/api/auth/[...nextauth].ts`

### API 路由設計

**已實作**：
- `GET /api/courses`：課程列表 + 篩選
- `GET /api/courses/[id]`：課程詳情
- `GET /api/courses/[id]/reviews`：課程評價列表 (需登入 @nkust.edu.tw)
- `GET /api/courses/[id]/summary`：評分摘要 (公開)
- `POST /api/reviews`：新增評價 (需登入)
- `PATCH /api/reviews/[id]`：編輯評價 (需登入)
- `POST /api/reviews/[id]/vote`：對評論投票（讚/倒讚）(需登入)
- `DELETE /api/reviews/[id]/vote`：取消投票 (需登入)
- `GET /api/courses/filters`：取得篩選選項 (學期/校區/系所等)
- `GET /api/search/suggestions`：搜尋建議

**尚未實作** (Schema 已定義，API 待開發)：
- 留言功能：`POST /api/reviews/[id]/comments`
- 檢舉功能：`POST /api/reviews/[id]/report`

## 重要開發注意事項

### 1. 爬蟲腳本特殊處理

**SSL 繞過**：高科大網站使用自簽憑證，爬蟲使用 Node.js `https` module 並設定 `rejectUnauthorized: false`
- 檔案：`scripts/scrape/nkust-ag202.mjs`
- 不要使用 curl/fetch，會遇到 SSL 錯誤

### 2. 資料匯入 Idempotency

- 使用 `sourceKey` (year#term:campus:degree:unit:selectCode) 確保可重複執行
- `upsert` 操作避免重複資料

### 3. TypeScript 路徑別名

- `@/*` 對應 `./src/*`
- 定義在 `tsconfig.json`

### 4. 前端樣式

- 主要使用 Tocas UI (CDN)
- 支援 light/dark mode (localStorage: 'nkust-theme')
- 主題切換邏輯在 `layout.tsx` inline script (避免 flash)
- 自訂樣式使用 CSS Modules

### 5. 環境變數

必要變數：
- `DATABASE_URL`：PostgreSQL 連線字串
- `NEXTAUTH_SECRET`：NextAuth 加密金鑰
- `NEXTAUTH_URL`：網站 URL
- `EMAIL_FROM`：寄件者 email
- `RESEND_API_KEY`：Resend API key

爬蟲/匯入變數：
- `NKUST_AG202_YMS_YMS`：學年學期 (例: "114#1")
- `NKUST_IMPORT_YEAR`、`NKUST_IMPORT_TERM`：匯入範圍限制
- `NKUST_SCRAPE_SYLLABUS`：是否抓取課綱 (1/0)
- `NKUST_DGR_ID`：學制 (例: "1" 日間部四技)
- `NKUST_UNIT_ID`：系所代碼 (例: "14")

### 6. GitHub Actions

- `.github/workflows/import-courses.yml`：單一學期匯入
- `.github/workflows/import-multiple-semesters.yml`：批次匯入
- 需要設定 Secret: `DATABASE_URL`

### 7. Commit Message 規範

使用 Conventional Commits (英文)：
- `feat:` 新功能
- `fix:` 修復
- `docs:` 文件
- `refactor:` 重構
- `chore:` 雜項

範例：`feat(scraper): add syllabus scraping support`

## 常見問題處理

### 全文搜尋不正常
```bash
npm run fix:search
```

### 資料庫連線問題
```bash
npm run db:check
```

### 爬蟲 SSL 錯誤
確認使用 `scripts/scrape/nkust-ag202.mjs` 而非自行寫的 fetch/curl

### Email 發送失敗
```bash
npm run test:email  # 測試 Resend 設定
# 檢查 RESEND_API_KEY 和 EMAIL_FROM
```

## 檔案結構關鍵路徑

```
src/
├── app/                 # Next.js App Router 頁面
│   ├── api/            # API Routes
│   ├── courses/        # 課程列表/詳情頁
│   └── auth/           # 認證頁面
├── components/         # React 組件
├── lib/                # 共用工具
│   ├── db.ts          # Prisma client singleton
│   ├── courseTimeParser.ts
│   ├── reviewSummary.ts
│   └── semesterFormatter.ts
├── pages/api/auth/    # NextAuth 設定 (Pages Router)
└── types/             # TypeScript 類型定義

scripts/
├── scrape/            # 爬蟲腳本
│   ├── nkust-ag202.mjs
│   └── nkust-ag064-syllabus.mjs
└── db/                # 資料庫操作
    └── import-nkust-ag202.mjs

data/nkust/ag202/      # 爬取的課程 JSON (不 commit 大量資料)
prisma/schema.prisma   # 資料庫 Schema
```

## 參考文件

- [產品需求](docs/requirements.md)
- [技術架構](docs/architecture.md)
- [資料抓取說明](docs/scraping.md)
- [環境變數配置](docs/env.md)
- [GitHub Actions 指南](.github/GITHUB_ACTIONS_GUIDE.md)
- [部署指南](DEPLOYMENT.md)
