# 環境變數設定檢查表

複製此清單到 Zeabur 的 Variables 頁面。

## ✅ 必要環境變數

### 1. DATABASE_URL
```
從 Zeabur PostgreSQL 服務複製
格式: postgresql://username:password@host:port/database
```
**取得方式：**
1. 點擊 PostgreSQL 服務
2. 前往 Instructions 或 Connection
3. 複製完整的 DATABASE_URL

---

### 2. NEXTAUTH_SECRET
```
使用以下指令產生：
openssl rand -base64 32
```
**範例：**
```
NEXTAUTH_SECRET=dGhpc2lzYXJhbmRvbXNlY3JldGtleWZvcnRlc3Rpbmc=
```

---

### 3. NEXTAUTH_URL
```
你的 Zeabur 網域
```
**範例：**
```
NEXTAUTH_URL=https://nkust-course-review.zeabur.app
```
**注意：** 設定網域後記得更新此變數！

---

### 4. EMAIL_FROM
```
發信者信箱
```
**使用 Resend 測試網域：**
```
EMAIL_FROM=noreply@resend.dev
```
**或使用自訂網域（需先在 Resend 驗證）：**
```
EMAIL_FROM=noreply@yourdomain.com
```

---

### 5. RESEND_API_KEY
```
從 Resend 取得
格式: re_xxxxxxxxxxxx
```
**取得方式：**
1. 註冊 https://resend.com/
2. 前往 API Keys 頁面
3. 建立新的 API Key
4. 複製 Key

---

## 🔧 選填變數（資料爬取用）

### NKUST_IMPORT_YEAR
```
要爬取的學年度
預設: 114
```

### NKUST_IMPORT_TERM
```
要爬取的學期
預設: 1
```

### NKUST_SCRAPE_SYLLABUS
```
是否爬取課程大綱
0 = 不爬取（推薦，較快）
1 = 爬取（很慢，每門課約 500ms）
預設: 0
```

---

## 📋 完整變數清單（複製用）

在 Zeabur Variables 頁面，逐一新增以下變數：

| 變數名稱 | 值 | 備註 |
|---------|-----|------|
| `DATABASE_URL` | `postgresql://...` | 從 PostgreSQL 服務複製 |
| `NEXTAUTH_SECRET` | `<用 openssl 產生>` | 至少 32 字元 |
| `NEXTAUTH_URL` | `https://your-app.zeabur.app` | 你的應用網域 |
| `EMAIL_FROM` | `noreply@resend.dev` | 或你的自訂網域 |
| `RESEND_API_KEY` | `re_xxxxxxxxxxxx` | 從 Resend 取得 |
| `NKUST_IMPORT_YEAR` | `114` | 選填 |
| `NKUST_IMPORT_TERM` | `1` | 選填 |
| `NKUST_SCRAPE_SYLLABUS` | `0` | 選填，建議設為 0 |

---

## ✓ 驗證環境變數

部署後，在 Zeabur Terminal 執行：

```bash
npm run check-env
```

應該看到：
```
✓ DATABASE_URL: 已設定
✓ NEXTAUTH_SECRET: 已設定
✓ NEXTAUTH_URL: 已設定
✓ EMAIL_FROM: 已設定
✓ RESEND_API_KEY: 已設定

✅ 所有必要環境變數已設定
```

---

## 🔐 安全注意事項

1. **不要將 `.env.local` 提交到 Git**
   - 已在 `.gitignore` 中設定
   - 僅將 `.env.example` 提交

2. **定期更換密鑰**
   - `NEXTAUTH_SECRET` 建議每季更換
   - `RESEND_API_KEY` 如有洩漏立即更換

3. **限制 API Key 權限**
   - Resend API Key 僅需 email 發送權限
   - 不要使用 admin 權限的 Key

---

## 📞 取得協助

- Zeabur 文件: https://zeabur.com/docs
- Resend 文件: https://resend.com/docs
- Next.js 文件: https://nextjs.org/docs
