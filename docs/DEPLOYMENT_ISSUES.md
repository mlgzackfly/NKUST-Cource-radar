# 部署後常見問題與解決方案

## 問題 1：網站顯示深色主題 🌑

### 原因

當主題設置為「自動」模式時，Tocas UI 會根據系統的 `prefers-color-scheme` 來決定主題：
- 如果您的系統設置為深色模式 → 網站顯示深色
- 如果您的系統設置為淺色模式 → 網站顯示淺色

### 解決方案

#### 方法 1：在網站上切換主題（使用者）

1. 訪問網站
2. 點擊右上角的「自動」按鈕
3. 切換到「淺色」或「深色」
4. 設置會保存在 localStorage

#### 方法 2：修改默認主題（開發者）

如果您希望默認使用淺色主題（不依賴系統設置）：

**修改 `src/app/layout.tsx`：**

```typescript
// 修改前
var mode = localStorage.getItem('nkust-theme') || 'auto';

// 修改後（默認淺色）
var mode = localStorage.getItem('nkust-theme') || 'light';
```

**同時修改 `src/components/ThemeToggle.tsx`：**

```typescript
// 修改前
const [mode, setMode] = useState<ThemeMode>("auto");

// 修改後
const [mode, setMode] = useState<ThemeMode>("light");

// 以及
useEffect(() => {
  const saved = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? "auto";
  // 改為
  const saved = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? "light";
  setMode(saved);
  applyTheme(saved);
}, []);
```

---

## 問題 2：搜尋建議消失了 🔍

### 原因

搜尋建議功能依賴 PostgreSQL 的全文搜索（Full-Text Search），需要：
1. ✅ `searchVector` 欄位（已在 schema 中）
2. ✅ GIN 索引（已在遷移中）
3. ⚠️ **觸發器必須正確創建**
4. ⚠️ **現有數據必須填充 searchVector**

**問題**：遷移可能沒有在 Zeabur 資料庫上執行，或執行不完整。

### 檢查是否有問題

執行以下 SQL 查詢：

```sql
-- 檢查 searchVector 是否有值
SELECT "courseName", "searchVector"
FROM "Course"
LIMIT 5;
```

如果 `searchVector` 全部是 `NULL`，則確認有問題。

### 解決方案

#### 步驟 1：確認遷移已執行

```bash
# 在本地或 Zeabur Shell 中執行
npx prisma migrate status
```

#### 步驟 2：部署遷移到 Zeabur

```bash
# 使用 Zeabur 的 DATABASE_URL
DATABASE_URL="your-zeabur-db-url" npx prisma migrate deploy
```

#### 步驟 3：手動修復（如果遷移失敗）

如果遷移無法執行，可以手動運行 SQL：

**連接到 Zeabur PostgreSQL：**

```bash
psql "$DATABASE_URL"
```

**執行以下 SQL：**

```sql
-- 1. 添加 searchVector 欄位（如果不存在）
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- 2. 創建觸發器函數
CREATE OR REPLACE FUNCTION course_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('simple', coalesce(NEW."courseName", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW."courseCode", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW."selectCode", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW."department", '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 創建觸發器
DROP TRIGGER IF EXISTS course_search_update ON "Course";
CREATE TRIGGER course_search_update
  BEFORE INSERT OR UPDATE ON "Course"
  FOR EACH ROW
  EXECUTE FUNCTION course_search_trigger();

-- 4. 填充現有數據的 searchVector
UPDATE "Course" SET "updatedAt" = "updatedAt";

-- 5. 創建 GIN 索引
CREATE INDEX IF NOT EXISTS "Course_searchVector_idx"
ON "Course" USING GIN ("searchVector");
```

#### 步驟 4：驗證修復

```sql
-- 應該返回有值的 searchVector
SELECT "courseName", "searchVector"
FROM "Course"
WHERE "searchVector" IS NOT NULL
LIMIT 5;
```

#### 步驟 5：測試搜尋建議

1. 訪問網站首頁
2. 在搜尋框輸入至少 2 個字
3. 應該會看到建議下拉選單

---

## 快速修復腳本

我已經創建了一個腳本來自動修復這些問題：

### 使用方法

```bash
# 修復搜尋建議
npm run fix:search

# 或者手動執行
node scripts/fix-search-vector.mjs
```

---

## 預防措施

### 1. 確保遷移在部署時執行

在 `package.json` 中添加部署後鉤子：

```json
{
  "scripts": {
    "build": "prisma migrate deploy && next build",
    "postinstall": "prisma generate"
  }
}
```

### 2. 檢查 Zeabur 環境變數

確保 `DATABASE_URL` 正確設置且可訪問。

### 3. 定期檢查資料庫狀態

```bash
npm run db:check
```

---

## 其他常見問題

### Q: 為什麼本地正常，Zeabur 異常？

**A**: 可能的原因：
1. 環境變數不同
2. 資料庫遷移未同步
3. 資料庫權限問題
4. PostgreSQL 版本差異

### Q: 如何同步本地和 Zeabur 的資料庫？

**A**:
1. **不要**在 Zeabur 上手動修改資料庫
2. 所有變更通過 Prisma migrate
3. 本地測試後部署：`prisma migrate deploy`

### Q: 搜尋建議還是不工作？

**A**: 檢查以下項目：
1. ✅ 資料庫中有課程數據
2. ✅ searchVector 欄位有值
3. ✅ GIN 索引已創建
4. ✅ API `/api/search/suggestions` 返回數據
5. ✅ 瀏覽器控制台無錯誤

---

## 需要幫助？

如果以上方案無法解決問題：

1. 檢查瀏覽器控制台錯誤
2. 檢查 Zeabur 應用日誌
3. 執行 `npm run db:check` 查看資料庫狀態
4. 開啟 GitHub Issue 附上錯誤訊息

---

**最後更新：** 2024-12-19
