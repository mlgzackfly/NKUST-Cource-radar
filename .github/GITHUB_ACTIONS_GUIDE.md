# GitHub Actions 數據匯入指南

使用 GitHub Actions 在雲端自動爬取和匯入課程數據，無需佔用本地資源或 Zeabur 部署時間。

## 📋 目錄

- [前置設定](#前置設定)
- [使用方式](#使用方式)
- [注意事項](#注意事項)
- [常見問題](#常見問題)

---

## 🔧 前置設定

### 步驟 1：設置 GitHub Secret

1. 前往 GitHub 專案頁面
2. 點擊 **Settings** > **Secrets and variables** > **Actions**
3. 點擊 **New repository secret**
4. 添加以下 Secret：

   | Name | Value | 說明 |
   |------|-------|------|
   | `DATABASE_URL` | `postgresql://user:pass@host:port/db` | Zeabur PostgreSQL 連線字串 |

#### 如何取得 DATABASE_URL？

**方法 1：從 Zeabur 環境變數複製**

1. 登入 Zeabur Dashboard
2. 進入您的專案 > PostgreSQL 服務
3. 點擊 **Variables** 或 **Instructions**
4. 複製 `DATABASE_URL` 的值

**方法 2：從本地 .env.local 複製**

如果您已經在本地測試過，可以直接從 `.env.local` 複製 `DATABASE_URL`。

⚠️ **重要**：確保這個 URL 是指向 Zeabur PostgreSQL，而非本地資料庫！

### 步驟 2：確認 Workflow 已啟用

1. 前往 **Actions** 頁面
2. 確認看到以下兩個 Workflow：
   - **Import Course Data** - 匯入單一學期
   - **Import Multiple Semesters** - 批次匯入多個學期

如果沒有看到，請確認 `.github/workflows/` 目錄中的檔案已提交並推送。

---

## 🚀 使用方式

### 方法 1：匯入單一學期（推薦新手）

適合：匯入特定一個學期的數據

1. 前往 GitHub 專案的 **Actions** 頁面
2. 選擇 **Import Course Data** workflow
3. 點擊 **Run workflow** 按鈕
4. 填寫參數：

   | 參數 | 說明 | 範例 |
   |------|------|------|
   | 學年度 | 輸入學年（民國年） | `114` |
   | 學期 | 選擇學期 | `1` 或 `2` |
   | 爬取課程大綱 | 是否包含課程大綱 | 通常選 `false` |

5. 點擊綠色的 **Run workflow** 按鈕
6. 等待執行完成（約 30-60 分鐘）

#### 預期時間

- **不含課程大綱**：30-60 分鐘
- **含課程大綱**：2-4 小時（⚠️ 不推薦）

### 方法 2：批次匯入多個學期（推薦進階）

適合：一次匯入多個學期的數據

1. 前往 GitHub 專案的 **Actions** 頁面
2. 選擇 **Import Multiple Semesters** workflow
3. 點擊 **Run workflow** 按鈕
4. 填寫參數：

   | 參數 | 說明 | 範例 |
   |------|------|------|
   | 要匯入的學期 | 用逗號分隔多個學期 | `113-1,113-2,114-1` |
   | 爬取課程大綱 | 是否包含課程大綱 | 通常選 `false` |

5. 點擊綠色的 **Run workflow** 按鈕
6. 等待執行完成（約 1.5-3 小時）

#### 預期時間

- **3 個學期（不含大綱）**：1.5-3 小時
- **3 個學期（含大綱）**：可能超過 6 小時 ⚠️

### 方法 3：自動定時執行

Workflow 已設置每學期自動執行：

- **2 月 1 日**：自動爬取上一學年度第 1 學期（例如：113-1）
- **9 月 1 日**：自動爬取本學年度第 1 學期（例如：114-1）

無需手動操作，GitHub Actions 會自動執行！

---

## 📊 查看執行結果

### 即時監控

1. 點擊正在執行的 Workflow
2. 點擊 Job 名稱（例如：`import-data`）
3. 展開各個步驟查看即時日誌

### 驗證匯入結果

執行完成後，可以：

1. **查看 GitHub Actions 日誌**
   - 在最後的 "Verify import" 步驟會顯示匯入的課程和教師數量

2. **登入應用查看**
   - 前往您的網站課程列表頁面
   - 確認新學期的課程已顯示

3. **直接查詢資料庫**（可選）
   ```bash
   psql "$DATABASE_URL" -c "
     SELECT year, term, COUNT(*) as courses
     FROM \"Course\"
     GROUP BY year, term
     ORDER BY year DESC, term DESC;
   "
   ```

---

## ⚠️ 注意事項

### 執行時間限制

- **GitHub Actions 免費版**：單次執行最多 **6 小時**
- **建議**：不要爬取課程大綱，否則可能超時

### 資料庫連線

- 確保 Zeabur PostgreSQL 允許外部連線（通常已開啟）
- 如果連線失敗，檢查 `DATABASE_URL` Secret 是否正確

### 重複執行保護

- Workflow 會自動檢查是否已有該學期資料
- 如果已存在，會自動跳過，不會重複匯入

### 並行限制

- 建議一次只執行一個 Workflow
- 避免多個 Workflow 同時寫入資料庫

### 成本

GitHub Actions 免費額度（每月）：
- **公開專案**：無限制 ✅
- **私有專案**：2,000 分鐘

如果您的專案是公開的，可以放心使用！

---

## 🐛 常見問題

### Q1: Workflow 執行失敗，顯示資料庫連線錯誤

**A**: 檢查 GitHub Secret 中的 `DATABASE_URL` 是否正確設置。

```bash
# DATABASE_URL 格式範例
postgresql://username:password@hostname:port/database

# Zeabur 格式通常是
postgresql://root:password@xxx.clusters.zeabur.com:5432/zeabur
```

### Q2: 執行超過 6 小時被中斷

**A**: 可能的原因：
- 爬取了課程大綱（建議關閉）
- 一次匯入太多學期（建議分批執行）
- 網路速度較慢

**解決方案**：
1. 關閉「爬取課程大綱」選項
2. 減少一次匯入的學期數（例如：一次只匯入 2 個學期）

### Q3: 如何重新匯入某個學期？

**A**: Workflow 會自動跳過已有資料的學期。如果需要重新匯入：

1. 先手動刪除該學期的資料：
   ```bash
   psql "$DATABASE_URL" -c "
     DELETE FROM \"Course\"
     WHERE year = '114' AND term = '1';
   "
   ```

2. 然後再次執行 Workflow

### Q4: 可以匯入過去的學期嗎（例如 112-1）？

**A**: 可以！但需要注意：
- 高科大網站可能不保留太舊的資料
- 如果爬取失敗，表示該學期資料已不可用

### Q5: Workflow 顯示成功，但網站上看不到新資料？

**A**: 可能的原因：
1. **快取問題**：重新整理頁面或清除瀏覽器快取
2. **資料庫連線錯誤**：確認 `DATABASE_URL` 指向正確的資料庫
3. **匯入數量為 0**：檢查 Workflow 日誌中的 "Verify import" 步驟

### Q6: 可以取消正在執行的 Workflow 嗎？

**A**: 可以！

1. 前往 Actions 頁面
2. 點擊正在執行的 Workflow
3. 點擊右上角的 **Cancel workflow** 按鈕

### Q7: 執行失敗後如何重試？

**A**:
1. 前往 Actions 頁面
2. 點擊失敗的 Workflow
3. 點擊右上角的 **Re-run jobs** > **Re-run failed jobs**

---

## 📝 最佳實踐

### 建議的匯入策略

#### 初次部署

```
1. 使用「Import Multiple Semesters」一次匯入：
   113-1,113-2,114-1

2. 預期時間：1.5-3 小時

3. 完成後驗證資料
```

#### 定期更新

```
1. 每學期開始時（2 月或 9 月）
2. 使用「Import Course Data」手動觸發一次
3. 或依賴自動排程（已設定）
```

#### 應急處理

```
如果資料有問題：
1. 使用「Import Course Data」重新匯入單一學期
2. 設置「scrape_syllabus = true」獲取完整資料
```

---

## 🎯 快速開始檢查清單

- [ ] 設置 GitHub Secret: `DATABASE_URL`
- [ ] 確認 Workflow 已啟用
- [ ] 執行一次測試（建議先測試 114-1）
- [ ] 檢查執行日誌是否成功
- [ ] 驗證網站上是否顯示新數據
- [ ] （可選）設置 Email 通知以接收執行結果

---

## 📚 相關資源

- [GitHub Actions 文檔](https://docs.github.com/en/actions)
- [Workflow 語法參考](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [DEPLOYMENT.md](../DEPLOYMENT.md) - 部署指南
- [README.md](../README.md) - 專案說明

---

**最後更新：** 2024-12
