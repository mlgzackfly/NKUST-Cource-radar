# 資料抓取（NKUST `ag202.jsp`）

## 來源
- `https://webap.nkust.edu.tw/nkust/ag_pro/ag202.jsp`

## 本地執行

```bash
npm install
npm run scrape:nkust-ag202
```

## 參數（環境變數）
- **`NKUST_YMS_YMS`**：學年學期（例：`114#1`）
- **`NKUST_CMP_AREA_ID`**：校區（例：`0` 全校區；或 `ALL` 代表逐一抓所有校區選項）
- **`NKUST_DGR_ID`**：學制（例：`14` 日間部四技；或 `ALL` 代表逐一抓所有學制選項）
- **`NKUST_UNT_ID`**：系所代碼（例：`UE15`；若不填且 `NKUST_SCRAPE_ALL_UNITS=1` 會抓全部系所）
- **`NKUST_SCRAPE_ALL_UNITS`**：`1` 表示抓全部系所（預設 `0`）
- **`NKUST_CLYEAR`**：年級（預設 `%` 全部）
- **`NKUST_WEEK`**：星期（預設 `%` 全部）
- **`NKUST_PERIOD`**：節次（預設 `%` 全部）

## 輸出
- `data/nkust/ag202/{year}/{term}/{cmp_area_id}/{dgr_id}/`
  - `{unt_id}.json`：單一系所的課程結果
  - `index.json`：本次抓取的索引與統計
- `data/nkust/ag202/{year}/{term}/index.json`：本次全量抓取的總索引（跨校區/學制）

## GitHub Actions
- Workflow：`.github/workflows/scrape-nkust-ag202.yml`
- 支援：每日排程（cron）與手動觸發（workflow_dispatch）


