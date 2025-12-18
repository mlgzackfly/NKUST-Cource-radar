# 快速部署步驟

## 前置準備檢查 ✓

- [x] PostgreSQL 已在 Zeabur 運行
- [x] 所有程式碼已 commit
- [ ] 程式碼已推送到 GitHub
- [ ] 已取得 Resend API Key

## 步驟 1：推送到 GitHub

如果還沒有 remote，先設定：

```bash
# 在 GitHub 建立 repository
# 然後執行：
git remote add origin https://github.com/your-username/nkust-course-review.git
git branch -M main
git push -u origin main
```

如果已有 remote，直接推送：

```bash
git push
```

## 步驟 2：取得 Resend API Key

1. 前往 https://resend.com/
2. 註冊或登入帳號
3. 前往「API Keys」→ 建立新 Key
4. 複製 API Key（格式：`re_xxxxxxxxxxxx`）
5. 設定發信網域（可用 Resend 提供的測試網域）

## 步驟 3：在 Zeabur 部署應用

### 3.1 新增服務

1. 開啟你的 Zeabur 專案（PostgreSQL 所在的專案）
2. 點擊「Add Service」
3. 選擇「GitHub」
4. 授權 GitHub 並選擇 `nkust-course-review` repository
5. 選擇 `main` 分支
6. 等待服務建立

### 3.2 設定環境變數

在應用服務頁面，前往「Variables」，新增以下變數：

#### 必要變數

```bash
# 從你的 PostgreSQL 服務複製
DATABASE_URL=postgresql://...

# 產生 secret（執行：openssl rand -base64 32）
NEXTAUTH_SECRET=<你產生的 secret>

# 你的網域（先用 Zeabur 提供的，格式如下）
NEXTAUTH_URL=https://nkust-course-review.zeabur.app

# Resend 設定
EMAIL_FROM=noreply@resend.dev
RESEND_API_KEY=re_xxxxxxxxxxxx
```

#### 選填變數（資料爬取用）

```bash
NKUST_IMPORT_YEAR=114
NKUST_IMPORT_TERM=1
NKUST_SCRAPE_SYLLABUS=0
```

### 3.3 取得 DATABASE_URL

1. 在 Zeabur 專案中點擊你的 PostgreSQL 服務
2. 前往「Instructions」或「Connection」
3. 複製 `DATABASE_URL`（完整連線字串）

### 3.4 產生 NEXTAUTH_SECRET

在本地終端執行：

```bash
openssl rand -base64 32
```

複製輸出的字串。

### 3.5 設定網域

1. 在應用服務中，前往「Domains」
2. 點擊「Generate Domain」取得免費網域
3. 或使用「Custom Domain」設定自訂網域
4. 將網域設定到 `NEXTAUTH_URL` 環境變數

**重要：** 設定網域後，記得更新 `NEXTAUTH_URL` 環境變數！

## 步驟 4：部署完成，執行資料庫遷移

### 4.1 開啟 Terminal

1. 在應用服務頁面，點擊右上角的「...」選單
2. 選擇「Terminal」或「Shell」

### 4.2 執行遷移

```bash
npm run db:migrate:deploy
```

預期輸出：
```
✓ Prisma schema loaded
✓ Database connection established
✓ Applying migrations...
✓ All migrations have been applied
```

## 步驟 5：初始化課程資料

**⚠️ 注意：此步驟需要 30-60 分鐘**

### 5.1 執行初始化

在 Zeabur Terminal 中：

```bash
npm run init-data
```

### 5.2 監控進度

腳本會顯示：
- ✓ 資料庫連線檢查
- 爬取課程資料進度
- 匯入資料庫進度
- 最終統計（課程數量、教師數量）

### 5.3 確認結果

初始化完成後，訪問你的網站：
- 首頁應該顯示課程統計
- 課程列表能載入資料
- 搜尋功能正常運作

## 步驟 6：測試功能

### 6.1 測試登入

1. 使用 @nkust.edu.tw 信箱登入
2. 檢查是否收到登入郵件
3. 點擊連結確認能成功登入

### 6.2 測試評論

1. 登入後前往任一課程頁面
2. 嘗試發表評論
3. 確認評論顯示正常

### 6.3 測試搜尋

1. 在首頁搜尋框輸入課程名稱
2. 確認搜尋建議顯示
3. 確認搜尋結果正確

## 常見問題處理

### Q1: 部署失敗，出現 build error

**檢查：**
1. 查看 Zeabur 的 Logs 頁面
2. 確認環境變數都已設定
3. 確認 Node.js 版本（應該是 20.x）

**解決：**
```bash
# 在 Zeabur Variables 確認所有必要變數
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
EMAIL_FROM
RESEND_API_KEY
```

### Q2: 資料庫連線失敗

**檢查：**
1. `DATABASE_URL` 格式是否正確
2. PostgreSQL 服務是否正常運行
3. 應用和資料庫是否在同一 Zeabur 專案

**解決：**
重新複製 PostgreSQL 的 `DATABASE_URL` 並更新環境變數。

### Q3: init-data 執行太久或逾時

**原因：** 爬取資料需要時間（每門課約 500ms）

**解決方案 1：** 關閉課程大綱爬取
```bash
# 在 Variables 設定
NKUST_SCRAPE_SYLLABUS=0
```

**解決方案 2：** 使用本地爬取再匯入
```bash
# 在本地執行爬取
npm run scrape:nkust-ag202

# 將 data 目錄推送到 GitHub

# 在 Zeabur 只執行匯入
npm run db:import:nkust-ag202
```

### Q4: 登入郵件收不到

**檢查：**
1. `RESEND_API_KEY` 是否正確
2. `EMAIL_FROM` 使用的網域是否已驗證
3. 查看 Resend Dashboard 的 Logs

**解決：**
1. 使用 Resend 提供的測試網域：`noreply@resend.dev`
2. 或驗證你的自訂網域

## 部署完成檢查清單

- [ ] 網站能正常訪問
- [ ] 首頁顯示課程統計
- [ ] 課程列表載入正常
- [ ] 搜尋功能運作
- [ ] 登入功能正常（收到郵件）
- [ ] 能發表評論
- [ ] 評論顯示正常
- [ ] 隱私權政策頁面可訪問
- [ ] Cookie 使用說明頁面可訪問

## 後續維護

### 更新應用

```bash
# 推送新 commit 到 GitHub
git add .
git commit -m "update: ..."
git push

# Zeabur 會自動偵測並重新部署
```

### 更新課程資料

當新學期開始時：

```bash
# 在 Zeabur Terminal
NKUST_IMPORT_YEAR=114 NKUST_IMPORT_TERM=2 npm run scrape:nkust-ag202
NKUST_IMPORT_YEAR=114 NKUST_IMPORT_TERM=2 npm run db:import:nkust-ag202
```

### 監控與備份

1. **監控**：定期檢查 Zeabur 的 Metrics 頁面
2. **日誌**：查看 Logs 頁面了解錯誤
3. **備份**：建議定期備份 PostgreSQL 資料

---

**需要協助？** 查看完整部署指南 [DEPLOYMENT.md](./DEPLOYMENT.md)
