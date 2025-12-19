# 高科選課雷達 | NKUST Course Review

選課，不只是憑感覺。提供 NKUST 課程查詢與匿名評價，讓你選課更明智。

[![部署狀態](https://img.shields.io/badge/部署-Zeabur-brightgreen)](https://zeabur.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## ✨ 功能特色

- 📚 **完整課程資訊**：涵蓋所有校區、學制、系所的課程
- 🔍 **智慧搜尋**：快速找到想要的課程和教師
- 📊 **視覺化評分**：雷達圖展示課程多維度評價
- 🔐 **校內信箱登入**：使用 @nkust.edu.tw 信箱即可使用
- 💬 **匿名評論**：安全地分享修課心得
- 📱 **響應式設計**：支援手機、平板、電腦

## 🚀 快速開始

### 方法 1：訪問線上版本（推薦）

直接訪問部署好的網站（請向管理員詢問網址）

### 方法 2：本地開發

```bash
# 1. 複製專案
git clone https://github.com/mlgzackfly/nkust-course-review.git
cd nkust-course-review

# 2. 安裝依賴
npm install

# 3. 設置環境變數
cp .env.example .env.local
# 編輯 .env.local，填入必要的環境變數

# 4. 初始化資料庫
npx prisma migrate dev
npx prisma generate

# 5. 啟動開發伺服器
npm run dev
```

訪問 http://localhost:3000

## 📊 數據匯入

### 使用 GitHub Actions（推薦）⭐

**完全自動化，無需佔用本地資源！**

1. 設置 GitHub Secret：`DATABASE_URL`
2. 前往 Actions 頁面
3. 選擇 Workflow 並執行

詳細說明：[📖 GitHub Actions 使用指南](.github/GITHUB_ACTIONS_GUIDE.md)

### 本地手動匯入

```bash
# 匯入單一學期
NKUST_IMPORT_YEAR=114 NKUST_IMPORT_TERM=1 npm run scrape:nkust-ag202
NKUST_IMPORT_YEAR=114 NKUST_IMPORT_TERM=1 npm run db:import:nkust-ag202

# 批次匯入多個學期
node scripts/import-all-semesters.mjs
```

## 📖 文檔

### 開發文檔
- [產品需求](docs/requirements.md)
- [技術架構](docs/architecture.md)
- [資料抓取說明](docs/scraping.md)
- [環境變數配置](docs/env.md)

### 部署與維運
- [🚀 部署指南](DEPLOYMENT.md) - Zeabur 部署完整教學
- [🤖 GitHub Actions 指南](.github/GITHUB_ACTIONS_GUIDE.md) - 自動化數據匯入

## 🛠️ 技術棧

- **前端框架**：Next.js 15 + React 19
- **樣式**：Tocas UI + CSS Modules
- **資料庫**：PostgreSQL + Prisma ORM
- **身份驗證**：NextAuth.js
- **郵件服務**：Resend
- **圖表**：ECharts
- **部署**：Zeabur

## 📂 專案結構

```
nkust-course-review/
├── src/
│   ├── app/              # Next.js App Router 頁面
│   ├── components/       # React 組件
│   ├── lib/              # 工具函數
│   ├── pages/api/        # API Routes（NextAuth）
│   └── types/            # TypeScript 類型定義
├── scripts/
│   ├── scrape/           # 爬蟲腳本
│   ├── db/               # 資料庫匯入腳本
│   └── import-all-semesters.mjs  # 批次匯入
├── prisma/
│   └── schema.prisma     # 資料庫 Schema
├── .github/
│   └── workflows/        # GitHub Actions
└── public/               # 靜態資源
```

## 🔐 環境變數

```env
# 資料庫
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="https://your-domain.com"

# 郵件服務（Resend）
EMAIL_FROM="noreply@your-domain.com"
RESEND_API_KEY="re_..."

# 資料匯入（可選）
NKUST_IMPORT_YEAR="114"
NKUST_IMPORT_TERM="1"
NKUST_SCRAPE_SYLLABUS="0"
```

詳細說明請參考 [環境變數文檔](docs/env.md)

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

1. Fork 本專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📜 授權

本專案採用 MIT 授權 - 詳見 [LICENSE](LICENSE) 檔案

## 🙏 致謝

- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [Tocas UI](https://tocas-ui.com/)
- [Zeabur](https://zeabur.com/)

## 📞 聯絡

如有問題或建議，請：
- 開啟 [GitHub Issue](https://github.com/mlgzackfly/nkust-course-review/issues)
- 或透過 Pull Request 直接貢獻

---

**注意**：本專案為非官方專案，與高雄科技大學無正式關聯。所有資料僅供參考。


