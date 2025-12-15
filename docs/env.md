# 環境變數

## 必要
- **`DATABASE_URL`**：PostgreSQL 連線字串（Zeabur 會提供）

## 本機設定（建議）
在專案根目錄建立 `.env.local`（請勿提交到 git）：

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB"
```

## 匯入腳本（可選）
- **`NKUST_IMPORT_YEAR`**：只匯入指定學年（例如 `114`）
- **`NKUST_IMPORT_TERM`**：只匯入指定學期（例如 `1`）


