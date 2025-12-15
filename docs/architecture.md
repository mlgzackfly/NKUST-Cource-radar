# 技術架構（Draft）

## 1. 技術選型（已確認）
- **前後端**：Next.js（App Router + Route Handlers / Server Actions 視需要）
- **資料庫**：PostgreSQL
- **部署**：Zeabur
- **登入**：先延後（先完成前後端基本功能與資料流）
- **課程資料同步**：網站啟動/部署後以腳本從 `data/nkust/...json` 匯入 DB（可重跑）

## 2. 系統邊界與資料流

### 2.1 課程資料（Course）
- GitHub Actions 定期產出 `data/nkust/ag202/.../*.json`
- 匯入腳本將 JSON 正規化後寫入 PostgreSQL
- Web 端查詢一律以 DB 為主（避免讀 JSON 的效能與查詢限制）

### 2.2 評價資料（Review）
- 使用者新增評價（1 人 1 課 1 則）
- 評價允許編輯，但必須保留版本（ReviewVersion）
- 評價一律匿名呈現（不回傳 user 可識別資訊給前端）

### 2.3 可見性（未登入 vs 已登入）
- **未登入**：只可看課程與「評分摘要」（例如平均分/分佈、評論數）
- **已登入**：可看「文字評價內容」、可留言、可按「有幫助」
- 註：登入機制後續補上；目前 API 會保留「需要登入」的判斷點（先以 stub/feature flag 代替）

## 3. 資料模型（摘要）
- **Course**：課程主體（學期、校區、學制、系所、課名、老師、時間地點…）
- **Instructor**：教師（先以姓名為主；同名後續再處理）
- **Review**：每人每課一則（目前狀態：active/hidden/removed）
- **ReviewVersion**：每次編輯保留一份快照
- **Comment**：留言（掛在 Review）
- **HelpfulVote**：有幫助（掛在 Review；同一 user 對同一 review 只能一次）
- **Report**：檢舉（由一般使用者提出）
- **AdminAction**：管理員處置紀錄（隱藏/下架/封鎖/要求修改）

## 4. API（草案）
- `GET /api/courses`：搜尋/列表（可加篩選：學期、校區、學制、系所、老師）
- `GET /api/courses/:id`：課程資訊 + 評分摘要（未登入）
- `GET /api/courses/:id/reviews`：已登入才回傳 review 內容（未登入回 401/403 或只回摘要）
- `POST /api/reviews`：建立評價（需登入）
- `PATCH /api/reviews/:id`：編輯評價（需登入；寫入 ReviewVersion）
- `POST /api/reviews/:id/comments`：留言（需登入）
- `POST /api/reviews/:id/helpful`：有幫助（需登入）
- `POST /api/reviews/:id/report`：檢舉（需登入）

## 5. 部署（Zeabur）注意事項（草案）
- 設定環境變數：`DATABASE_URL`、（之後）`EMAIL_*`
- DB migration：使用 Prisma migrate（CI 或 deploy hook）
- 匯入資料：提供一次性/可重跑的 import 指令（由你決定在 Zeabur 的 post-deploy 或手動跑）
  - 指令：`npm run db:import:nkust-ag202`
  - 可選限制：`NKUST_IMPORT_YEAR` / `NKUST_IMPORT_TERM`


