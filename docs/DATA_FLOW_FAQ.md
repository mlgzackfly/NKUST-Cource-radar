# 數據流程常見問題

## ❓ 常見疑問

### Q1: GitHub Actions 爬取的數據存在哪裡？

**A**: 最終存在 **Zeabur PostgreSQL 資料庫**中，不是文件系統。

流程：
```
GitHub Actions 爬蟲
  ↓ 生成臨時 ./data/ 文件
  ↓ 讀取並解析
  ↓ 寫入 PostgreSQL (通過 DATABASE_URL)
  ↓ ✅ 數據永久保存在資料庫
  ↓ ❌ ./data/ 文件被丟棄（環境銷毀）
```

---

### Q2: Zeabur 應用需要 ./data/ 目錄嗎？

**A**: **完全不需要！**

Zeabur 應用：
- ✅ 通過 `DATABASE_URL` 連接 PostgreSQL
- ✅ 使用 Prisma 查詢資料庫
- ✅ 所有數據來自資料庫，不讀取文件

證據：
```typescript
// src/app/api/courses/route.ts
const courses = await prisma.course.findMany({
  where: { ... },
  // ✅ 從資料庫查詢，不讀取文件
});
```

---

### Q3: ./data/ 目錄的作用是什麼？

**A**: 僅作為**爬蟲的中間輸出**，供匯入腳本讀取。

| 誰使用 | 何時使用 | 用途 |
|--------|---------|------|
| 爬蟲腳本 | 爬取時 | 寫入 JSON 文件 |
| 匯入腳本 | 匯入時 | 讀取 JSON 並寫入資料庫 |
| ~~Zeabur 應用~~ | ~~從不~~ | ~~不讀取此目錄~~ |

---

### Q4: 如何確認數據已經在資料庫中？

**A**: 使用提供的檢查腳本：

```bash
# 檢查資料庫狀態
npm run db:check
```

輸出範例：
```
✅ 資料庫連線成功

📊 資料庫統計:
   課程總數: 17234
   教師總數: 1523

📚 各學期課程數量:
   114 學年度第 1 學期: 5602 筆
   113 學年度第 2 學期: 5816 筆
   113 學年度第 1 學期: 5816 筆
```

---

### Q5: GitHub Actions 的 ./data/ 會保留嗎？

**A**: **不會！** 每次執行都是全新環境。

```
執行 #1:
  ┌─ 新環境
  ├─ 爬取 → ./data/
  ├─ 匯入 → PostgreSQL ✅
  └─ 環境銷毀 → ./data/ 消失 ❌

執行 #2:
  ┌─ 又是新環境（與 #1 無關）
  ├─ 爬取 → ./data/
  ├─ 匯入 → PostgreSQL ✅
  └─ 環境銷毀 → ./data/ 消失 ❌
```

但資料庫中的數據**永久保留** ✅

---

### Q6: 本地的 ./data/ 需要推送到 Git 嗎？

**A**: **不需要，也不建議！**

原因：
1. 文件太大（數百 MB）
2. 數據已經在資料庫中
3. GitHub 有文件大小限制
4. 每次爬取都會變化

`.gitignore` 已正確設置：
```gitignore
/data/
```

---

### Q7: 如果 GitHub Actions 執行失敗，數據會怎樣？

**A**: 取決於失敗階段。

| 失敗階段 | 資料庫狀態 | 說明 |
|---------|-----------|------|
| 爬取失敗 | 無變化 | 沒有新數據寫入 |
| 匯入失敗 | 無變化 | 交易回滾（Prisma） |
| 部分成功 | 部分匯入 | 已匯入的保留，可重試 |

**解決方案**：直接重新執行 Workflow

---

### Q8: 多次執行 GitHub Actions 會重複匯入嗎？

**A**: **不會！** Workflow 有防護機制。

```yaml
# 檢查是否已有資料
- name: Check existing data
  run: |
    COUNT=$(psql "$DATABASE_URL" -c "
      SELECT COUNT(*) FROM Course
      WHERE year = '$YEAR' AND term = '$TERM';
    ")

    if [ "$COUNT" -gt 0 ]; then
      echo "⏭️ 已存在，跳過"
      exit 0  # 不執行後續步驟
    fi
```

---

### Q9: Zeabur 應用如何讀取課程數據？

**A**: 完全通過 Prisma + PostgreSQL。

**頁面範例** (`src/app/courses/page.tsx`):
```typescript
// ✅ 從資料庫查詢
const courses = await prisma.course.findMany({
  where: { year, term },
  include: {
    instructors: {
      include: { instructor: true }
    }
  }
});
```

**API 範例** (`src/app/api/courses/route.ts`):
```typescript
// ✅ 從資料庫查詢
const courses = await prisma.course.findMany({
  where: { courseName: { contains: query } },
  take: 20
});
```

**沒有任何地方**讀取 `./data/` 目錄 ❌

---

### Q10: 如何驗證 Zeabur 上的數據是最新的？

**A**: 三種方法：

#### 方法 1：訪問網站
直接查看課程列表，確認學期選單中有最新學期。

#### 方法 2：使用檢查腳本（本地）
```bash
# 使用 Zeabur 的 DATABASE_URL
DATABASE_URL="postgresql://..." npm run db:check
```

#### 方法 3：Zeabur Shell（進階）
```bash
# 在 Zeabur Shell 中執行
psql $DATABASE_URL -c "
  SELECT year, term, COUNT(*) as courses
  FROM \"Course\"
  GROUP BY year, term
  ORDER BY year DESC, term DESC;
"
```

---

## 📊 數據流程總結

### 初次部署
```
1. 本地：配置環境變數 → .env.local
2. 本地：推送代碼到 GitHub
3. Zeabur：自動部署應用
4. GitHub Actions：爬取並匯入數據到 PostgreSQL
5. Zeabur 應用：從 PostgreSQL 讀取並顯示
```

### 日常更新
```
1. GitHub Actions：定期/手動執行爬蟲
2. 數據自動匯入 PostgreSQL
3. Zeabur 應用：自動顯示最新數據（無需重啟）
```

### 關鍵要點
- ✅ **唯一數據來源**：PostgreSQL 資料庫
- ✅ **唯一連接方式**：`DATABASE_URL` 環境變數
- ❌ **不需要**：./data/ 目錄在 Zeabur 上
- ❌ **不需要**：同步文件到 Zeabur

---

## 🔧 故障排除

### 問題：網站顯示「尚未連線資料庫」

**原因**：`DATABASE_URL` 環境變數未設置

**解決**：
1. 前往 Zeabur Dashboard
2. 檢查環境變數中的 `DATABASE_URL`
3. 確保格式正確：`postgresql://user:pass@host:port/db`

### 問題：課程列表為空

**可能原因**：
1. 資料庫中確實沒有數據
2. 查詢條件過於嚴格

**檢查**：
```bash
# 使用 db:check 腳本
npm run db:check
```

**解決**：
- 如果資料庫為空：執行 GitHub Actions 匯入數據
- 如果有數據但網站顯示空：檢查查詢條件（學期、校區等）

### 問題：GitHub Actions 顯示成功但網站沒更新

**檢查清單**：
1. ✅ GitHub Actions 的 `DATABASE_URL` Secret 正確嗎？
2. ✅ Zeabur 應用的 `DATABASE_URL` 環境變數正確嗎？
3. ✅ 兩者是否指向**同一個資料庫**？

**驗證**：
```bash
# 比對兩個 DATABASE_URL 的 host 部分
# GitHub Secret: postgresql://...@HOST1:port/db
# Zeabur Env:    postgresql://...@HOST2:port/db
# HOST1 應該等於 HOST2
```

---

## 📚 相關文檔

- [GitHub Actions 使用指南](../.github/GITHUB_ACTIONS_GUIDE.md)
- [部署指南](../DEPLOYMENT.md)
- [環境變數說明](env.md)

---

**最後更新：** 2024-12-19
