# 部署指南

本指南說明如何將高科選課雷達部署到 Zeabur 平台。

## 前置準備

### 1. 註冊必要服務

- **Zeabur 帳號**: https://zeabur.com/
- **Resend 帳號**: https://resend.com/ (用於發送登入郵件)
- **GitHub 帳號**: 確保專案已推送到 GitHub

### 2. 準備環境變數

複製 `.env.example` 為 `.env.local` 並填入以下資訊：

```env
# Database - Zeabur 會自動提供
DATABASE_URL="postgresql://..."

# NextAuth - 產生隨機密鑰
NEXTAUTH_SECRET="your-random-secret-here"
NEXTAUTH_URL="https://your-domain.zeabur.app"

# Email - 從 Resend 取得
EMAIL_FROM="noreply@your-domain.com"
RESEND_API_KEY="re_xxxxxxxxxx"

# Data Import (選填)
NKUST_IMPORT_YEAR="114"
NKUST_IMPORT_TERM="1"
NKUST_SCRAPE_SYLLABUS="0"
```

#### 產生 NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

#### 取得 Resend API Key

1. 註冊 https://resend.com/
2. 前往 API Keys 頁面
3. 建立新的 API Key
4. 設定 Domain (可使用 Resend 提供的測試網域)

## 部署到 Zeabur

### 方法一：透過 Zeabur Dashboard（推薦）

#### 步驟 1：建立專案

1. 登入 [Zeabur Dashboard](https://dash.zeabur.com/)
2. 點擊「Create Project」
3. 選擇區域（建議：Taiwan）

#### 步驟 2：新增 PostgreSQL 服務

1. 在專案中點擊「Add Service」
2. 選擇「Marketplace」→「PostgreSQL」
3. 等待資料庫建立完成
4. 點擊資料庫服務，複製 `DATABASE_URL`

#### 步驟 3：部署應用程式

1. 在專案中點擊「Add Service」
2. 選擇「GitHub」
3. 授權並選擇你的 repository
4. 選擇 `main` 分支

#### 步驟 4：設定環境變數

1. 點擊應用服務
2. 前往「Variables」頁面
3. 新增以下環境變數：
   - `DATABASE_URL`: 從 PostgreSQL 服務複製
   - `NEXTAUTH_SECRET`: 使用 `openssl rand -base64 32` 產生
   - `NEXTAUTH_URL`: `https://your-service.zeabur.app`
   - `EMAIL_FROM`: 你的寄件者信箱
   - `RESEND_API_KEY`: 從 Resend 取得

#### 步驟 5：設定自訂網域（選填）

1. 前往「Domains」頁面
2. 點擊「Generate Domain」或「Custom Domain」
3. 更新 `NEXTAUTH_URL` 為你的網域

#### 步驟 6：執行資料庫遷移

1. 在應用服務中，前往「Terminal」
2. 執行以下指令：

```bash
npm run db:migrate:deploy
```

#### 步驟 7：初始化資料

**重要：** 資料爬取需要 30-60 分鐘，建議在低流量時段執行。

在 Terminal 中執行：

```bash
npm run init-data
```

這個指令會：
- 檢查資料庫連線
- 爬取 114 學年度第 1 學期課程資料
- 自動匯入資料庫
- 顯示最終統計

### 方法二：使用 Zeabur CLI

#### 安裝 CLI

```bash
npm install -g @zeabur/cli
```

#### 登入

```bash
zeabur auth login
```

#### 部署

```bash
zeabur deploy
```

## 部署後檢查

### 1. 檢查服務狀態

訪問你的網域，確認應用正常運行：
- 首頁能正常顯示
- 課程列表能載入
- 搜尋功能正常

### 2. 測試登入功能

1. 使用 @nkust.edu.tw 信箱嘗試登入
2. 檢查是否收到登入郵件
3. 點擊連結確認能成功登入

### 3. 確認資料完整性

```bash
# 在 Zeabur Terminal 執行
node -e "
import('@prisma/client').then(async ({ PrismaClient }) => {
  const prisma = new PrismaClient();
  const count = await prisma.course.count();
  console.log('課程數量:', count);
  await prisma.\$disconnect();
});
"
```

預期結果應該有數千筆課程資料。

## 更新資料

### 手動更新特定學期

```bash
# 設定要爬取的學期
NKUST_IMPORT_YEAR=114 NKUST_IMPORT_TERM=2 npm run scrape:nkust-ag202
NKUST_IMPORT_YEAR=114 NKUST_IMPORT_TERM=2 npm run db:import:nkust-ag202
```

### 爬取課程大綱

**注意：** 爬取大綱非常耗時（每門課約 500ms），建議分批執行。

```bash
NKUST_SCRAPE_SYLLABUS=1 npm run scrape:nkust-ag202
npm run db:import:nkust-ag202
```

## 定期更新設定（選填）

如需定期自動更新課程資料，可以使用 GitHub Actions：

1. 在專案根目錄建立 `.github/workflows/update-data.yml`
2. 設定 cron schedule
3. 使用 Zeabur CLI 在 workflow 中執行更新

範例設定：

```yaml
name: Update Course Data
on:
  schedule:
    - cron: '0 2 * * 0' # 每週日凌晨 2 點
  workflow_dispatch: # 允許手動觸發

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run scrape:nkust-ag202
        env:
          NKUST_IMPORT_YEAR: '114'
          NKUST_IMPORT_TERM: '1'
      - run: npm run db:import:nkust-ag202
        env:
          DATABASE_URL: \${{ secrets.DATABASE_URL }}
```

## 常見問題

### 部署失敗

**問題：** Build 時出現錯誤
**解決：**
1. 檢查 `package.json` 的 `engines` 欄位
2. 確認 Node.js 版本相容（推薦 20.x）
3. 查看 Zeabur 的 build logs

### 資料庫連線失敗

**問題：** 無法連接資料庫
**解決：**
1. 確認 `DATABASE_URL` 環境變數正確
2. 檢查 PostgreSQL 服務是否正常運行
3. 確認應用和資料庫在同一個 Zeabur 專案中

### 登入郵件收不到

**問題：** 點擊登入後沒收到郵件
**解決：**
1. 檢查 `RESEND_API_KEY` 是否正確
2. 確認 `EMAIL_FROM` 使用已驗證的網域
3. 查看 Resend Dashboard 的 logs
4. 檢查垃圾郵件資料夾

### 資料爬取逾時

**問題：** `init-data` 執行逾時
**解決：**
1. 關閉課程大綱爬取：`NKUST_SCRAPE_SYLLABUS=0`
2. 分批爬取不同學期
3. 增加 Zeabur 服務的資源配額

## 監控與維護

### 檢查服務健康

定期監控以下指標：
- 應用 CPU 和記憶體使用率
- 資料庫連線數
- 回應時間
- 錯誤日誌

### 資料庫備份

建議定期備份資料庫：
1. 在 Zeabur Dashboard 中設定自動備份
2. 或手動匯出：

```bash
pg_dump $DATABASE_URL > backup.sql
```

### 更新應用程式

1. 推送新的 commit 到 GitHub
2. Zeabur 會自動偵測並重新部署
3. 如需手動觸發：在 Dashboard 點擊「Redeploy」

## 安全性建議

1. **定期更新依賴套件**
   ```bash
   npm audit
   npm update
   ```

2. **使用強密碼**
   - `NEXTAUTH_SECRET` 至少 32 字元
   - 定期更換 API keys

3. **限制存取**
   - 僅允許 @nkust.edu.tw 信箱登入（已實作）
   - 設定適當的 CORS 政策

4. **監控異常活動**
   - 定期檢查 logs
   - 設定異常告警

## 效能優化

1. **資料庫索引**
   - 已在 schema 中定義關鍵索引
   - 定期執行 `ANALYZE` 更新統計資訊

2. **快取策略**
   - Next.js 自動處理靜態頁面快取
   - 考慮使用 CDN 加速靜態資源

3. **資源監控**
   - 使用 Zeabur 內建的監控工具
   - 根據使用情況調整服務規格

## 支援

如遇到問題：
1. 查看 [Zeabur 文件](https://zeabur.com/docs)
2. 檢查 GitHub Issues
3. 參考本專案的 README.md

---

**最後更新：** 2024-12
