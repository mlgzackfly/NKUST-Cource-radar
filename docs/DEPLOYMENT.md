# 部署和自動化指南

## 🚀 部署架構

```
GitHub Actions (爬蟲) → PostgreSQL (Zeabur) ← Next.js (Zeabur/Vercel)
```

## 📋 部署前準備

### 1. 環境變數設定

在 Zeabur/Vercel 設定以下環境變數：

```bash
# 資料庫連線
DATABASE_URL=postgresql://user:password@host:port/dbname

# Admin API (選擇性)
ADMIN_SECRET=your-random-secret-key-here
GITHUB_TOKEN=ghp_your_github_personal_access_token
GITHUB_REPO_OWNER=your-github-username
GITHUB_REPO_NAME=nkust
```

### 2. GitHub Secrets 設定

在 GitHub Repository → Settings → Secrets and variables → Actions 新增：

```
DATABASE_URL=postgresql://user:password@host:port/dbname
```

## 🔄 自動爬蟲設定

### 方案 A：GitHub Actions 自動排程 (推薦)

**優點**：
- ✅ 完全免費
- ✅ 不佔用伺服器資源
- ✅ 自動執行，無需維護
- ✅ 有完整執行記錄

**排程時間**：
- 上學期：每年 8月1日
- 下學期：每年 1月15日

**檔案**：`.github/workflows/scrape-and-import.yml`

**手動觸發**：
1. 前往 GitHub → Actions
2. 選擇 "Scrape and Import Course Data"
3. 點擊 "Run workflow"
4. 輸入學年和學期
5. 執行

### 方案 B：透過 API 觸發

**使用情境**：需要即時更新資料

**呼叫方式**：
```bash
curl -X POST https://your-domain.com/api/admin/trigger-scrape \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"year": "114", "term": "1"}'
```

**回應**：
```json
{
  "success": true,
  "message": "Scraping workflow triggered for 114-1",
  "year": "114",
  "term": "1"
}
```

## 🗄️ 資料庫遷移策略

### 首次部署

```bash
# 1. 推送 schema 到資料庫
npx prisma db push

# 2. 執行爬蟲 (本地或 GitHub Actions)
NKUST_AG202_YMS_YMS="114#1" npm run scrape:nkust-ag202

# 3. 匯入資料
npm run db:import:nkust-ag202
```

### 每學期更新

由於課程資料特性：
- **90% 是新增**：新學期的課程
- **10% 是更新**：課程資訊修正

**建議策略**：

#### 選項 1：僅新增 (推薦)
```typescript
// import script 使用 upsert
await prisma.course.upsert({
  where: {
    // 使用複合唯一鍵
    year_term_selectCode: {
      year: "114",
      term: "1",
      selectCode: "UE15"
    }
  },
  create: { /* 課程資料 */ },
  update: { /* 更新欄位 */ }
})
```

#### 選項 2：完全替換 (清空舊資料)
```bash
# 僅在需要時使用
npm run db:reset
npm run db:import:nkust-ag202
```

## 📊 執行頻率建議

### 一年 10 次的執行時機

1. **選課前期** (8月初、1月中)：匯入新學期課程
2. **加退選期間** (開學後 2 週)：更新課程異動
3. **學期中** (10月、3月)：補正課程資訊

**詳細排程**：
```yaml
上學期：
  - 8/1：匯入 114-1 課程
  - 9/15：第一次加退選後更新
  - 10/1：期中補正

下學期：
  - 1/15：匯入 114-2 課程
  - 3/1：第一次加退選後更新
  - 4/1：期中補正

其他：
  - 5/1：暑期課程
  - 6/1：學年課程總整理
  - 11/1：寒期課程
  - 12/1：次學年課程預覽
```

## 🛡️ 資料庫效能優化

### 索引策略

```sql
-- 已有的全文搜尋索引
CREATE INDEX idx_course_search_vector ON "Course" USING GIN("searchVector");

-- 建議新增的索引
CREATE INDEX idx_course_year_term ON "Course"(year, term);
CREATE INDEX idx_course_department ON "Course"(department);
CREATE INDEX idx_course_campus ON "Course"(campus);
CREATE INDEX idx_course_updated_at ON "Course"("updatedAt");
```

### 查詢優化

```typescript
// ✅ 好的做法：使用 LIMIT
const courses = await prisma.course.findMany({
  take: 50,  // 限制結果數量
  where: { year: "114", term: "1" },
  orderBy: { updatedAt: "desc" }
})

// ❌ 避免：查詢全部資料
const allCourses = await prisma.course.findMany()
```

## 🔧 故障排除

### GitHub Actions 失敗

**檢查項目**：
1. DATABASE_URL secret 是否正確
2. 資料庫是否可從外部連線
3. GitHub Actions logs 中的錯誤訊息

**常見問題**：
```bash
# 問題：資料庫連線超時
解決：檢查 Zeabur 資料庫的防火牆設定

# 問題：Prisma schema 不同步
解決：執行 npx prisma generate

# 問題：爬蟲超時
解決：增加 workflow timeout 設定
```

### 資料匯入失敗

```bash
# 檢查 JSON 資料格式
cat data/nkust/ag202/114/1/index.json | jq .

# 測試本地匯入
DATABASE_URL="your-local-db" npm run db:import:nkust-ag202
```

## 📈 監控建議

### 設定 GitHub Notifications

1. Repository → Settings → Notifications
2. 啟用 "Actions" 通知
3. 選擇接收失敗通知

### 資料庫監控

使用 Zeabur Dashboard 監控：
- 連線數
- 查詢延遲
- 儲存空間使用率

## 🚦 部署檢查清單

- [ ] DATABASE_URL 環境變數已設定
- [ ] GitHub Secrets 已新增
- [ ] Prisma schema 已推送到資料庫
- [ ] 已匯入初始資料
- [ ] GitHub Actions workflow 測試成功
- [ ] 排程時間已確認
- [ ] 資料庫索引已建立
- [ ] 監控通知已設定

## 🔮 進階功能 (未來擴充)

### Webhook 通知

當爬蟲完成時發送通知到 Discord/Slack：

```yaml
- name: Notify Discord
  if: success()
  run: |
    curl -X POST ${{ secrets.DISCORD_WEBHOOK }} \
      -H "Content-Type: application/json" \
      -d '{"content": "✅ 課程資料已更新！學期: 114-1"}'
```

### 增量更新

只更新有變動的課程，減少資料庫寫入：

```typescript
const existingCourse = await prisma.course.findUnique({
  where: { selectCode: course.selectCode }
})

if (!existingCourse || hasChanged(existingCourse, course)) {
  await prisma.course.upsert({ /* ... */ })
}
```

### 資料版本控制

在資料庫中記錄每次匯入的版本：

```prisma
model DataImport {
  id        String   @id @default(cuid())
  year      String
  term      String
  timestamp DateTime @default(now())
  status    String   // "success" | "failed"
  coursesCount Int
}
```
