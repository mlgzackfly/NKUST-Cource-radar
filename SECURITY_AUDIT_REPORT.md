# 資安檢查報告

**專案**: 高科選課雷達 (NKUST Course Review)
**掃描日期**: 2025-12-27
**掃描範圍**: 完整程式碼庫 + 依賴套件

---

## 執行摘要

| 嚴重程度 | 數量 |
|---------|-----|
| 🔴 Critical | 0 |
| 🟠 High | 2 |
| 🟡 Medium | 4 |
| 🔵 Low | 3 |
| ✅ Info | 2 |

**總體評估**: 中等風險
**依賴套件**: ✅ 無已知 CVE 漏洞
**建議優先修復**: High 和 Medium 級別漏洞

---

## 🟠 High Severity Issues

### H-1: 缺少評分數值範圍驗證 (CWE-20: Improper Input Validation)

**嚴重程度**: High
**CVSS 評分**: 7.5
**影響範圍**:
- `/src/app/api/reviews/route.ts` (POST)
- `/src/app/api/reviews/[id]/route.ts` (PUT)

**問題描述**:
評分欄位 (coolness, usefulness, workload, attendance, grading) 沒有進行數值範圍驗證，攻擊者可以提交任意數值（如 999 或負數），導致：
1. 統計資料失真
2. 雷達圖顯示異常
3. 可能觸發前端渲染錯誤

**受影響程式碼**:
```typescript
// src/app/api/reviews/route.ts:55-67
const review = await prisma!.review.create({
  data: {
    userId: dbUser.id,
    courseId,
    coolness,      // ❌ 沒有驗證範圍
    usefulness,    // ❌ 沒有驗證範圍
    workload,      // ❌ 沒有驗證範圍
    attendance,    // ❌ 沒有驗證範圍
    grading,       // ❌ 沒有驗證範圍
    // ...
  }
});
```

**修復建議**:
```typescript
// 在 API 開頭新增驗證函數
function validateRating(value: any, fieldName: string): number | null {
  if (value === null || value === undefined) return null;

  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a number`);
  }
  if (num < 1 || num > 5) {
    throw new Error(`${fieldName} must be between 1 and 5`);
  }
  return num;
}

// 使用驗證
const validatedCoolness = validateRating(coolness, "coolness");
const validatedUsefulness = validateRating(usefulness, "usefulness");
// ... 其他評分
```

---

### H-2: 錯誤訊息洩露系統資訊 (CWE-209: Information Exposure Through Error Message)

**嚴重程度**: High
**CVSS 評分**: 6.5
**影響範圍**: 多個 API 端點

**問題描述**:
多個 API 端點在 catch block 中將完整錯誤訊息回傳給客戶端，可能洩露：
1. 資料庫結構資訊
2. 檔案系統路徑
3. 內部邏輯細節
4. 依賴套件版本

**受影響程式碼**:
```typescript
// src/app/api/reviews/route.ts:86-91
catch (error) {
  console.error("Failed to create review:", error);
  return NextResponse.json(
    { error: "Internal server error", details: String(error) },  // ❌ 洩露錯誤詳情
    { status: 500 }
  );
}
```

**受影響檔案清單**:
- `src/app/api/reviews/route.ts:89`
- `src/app/api/reviews/[id]/route.ts:86, 141`
- `src/app/api/reviews/[id]/vote/route.ts:101, 163`
- `src/app/api/reviews/[id]/report/route.ts:96`

**修復建議**:
```typescript
catch (error) {
  console.error("Failed to create review:", error);  // Server-side logging only

  // Production: 只回傳通用訊息
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }

  // Development: 可以包含詳情
  return NextResponse.json(
    { error: "Internal server error", details: String(error) },
    { status: 500 }
  );
}
```

---

## 🟡 Medium Severity Issues

### M-1: 缺少 Rate Limiting (CWE-770: Allocation of Resources Without Limits)

**嚴重程度**: Medium
**CVSS 評分**: 5.3
**影響範圍**: 所有 API 端點

**問題描述**:
專案缺少 API Rate Limiting 機制，攻擊者可以：
1. 暴力破解登入（雖然使用 email link，但仍可發送大量郵件）
2. DoS 攻擊（大量請求導致服務不可用）
3. 刷評論（快速發布大量評論）
4. 耗盡資料庫連線

**修復建議**:
使用 `@upstash/ratelimit` + Redis 或 `express-rate-limit`:

```typescript
// lib/ratelimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 requests per 10 seconds
});

// 在 API 中使用
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // ... 正常處理
}
```

**替代方案** (不需要 Redis):
使用 Next.js middleware + 記憶體快取（適合小型應用）

---

### M-2: 過多的 Debug Logging (CWE-532: Information Exposure Through Log Files)

**嚴重程度**: Medium
**CVSS 評分**: 4.3
**影響範圍**: NextAuth 設定

**問題描述**:
`src/pages/api/auth/[...nextauth].ts` 包含大量 console.log，在 production 環境可能洩露：
1. 使用者 email 地址
2. 登入 URL token
3. API keys 狀態

**受影響程式碼**:
```typescript
// src/pages/api/auth/[...nextauth].ts:26-36
console.log("=== sendVerificationRequest called ===");
console.log("Email (original):", email);              // ❌ 洩露用戶信箱
console.log("Email (normalized):", normalizedEmail);  // ❌ 洩露用戶信箱
console.log("URL:", url);                             // ❌ 洩露登入 token
console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY ? "✓ Set" : "✗ Not set");
console.log("EMAIL_FROM:", process.env.EMAIL_FROM);
```

**修復建議**:
```typescript
// 使用環境變數控制 logging
const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  console.log("=== sendVerificationRequest called ===");
  console.log("Email (normalized):", normalizedEmail.replace(/@.+/, '@***'));  // 部分遮罩
  console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY ? "✓ Set" : "✗ Not set");
}
```

---

### M-3: 缺少 Content Security Policy (CSP)

**嚴重程度**: Medium
**CVSS 評分**: 4.7
**影響範圍**: 整個應用程式

**問題描述**:
沒有設定 Content Security Policy headers，無法有效防護：
1. XSS 攻擊
2. Clickjacking
3. 不受信任的腳本注入

**修復建議**:
在 `next.config.js` 新增 security headers:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "connect-src 'self'",
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

---

### M-4: 缺少文字長度限制 (CWE-400: Uncontrolled Resource Consumption)

**嚴重程度**: Medium
**CVSS 評分**: 4.0

**問題描述**:
評論的 `body` 和 `authorDept` 欄位沒有長度限制，攻擊者可以提交超大文字：
1. 資料庫儲存空間耗盡
2. 前端渲染效能問題
3. 網路傳輸浪費

**受影響程式碼**:
```typescript
// src/app/api/reviews/route.ts:64
body: reviewBody?.trim() || null,  // ❌ 沒有長度檢查
authorDept: authorDept?.trim() || null,  // ❌ 沒有長度檢查
```

**修復建議**:
```typescript
// 驗證函數
function validateText(text: string | null | undefined, maxLength: number, fieldName: string): string | null {
  if (!text) return null;

  const trimmed = text.trim();
  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
  }

  return trimmed || null;
}

// 使用
const body = await request.json();
const validatedBody = validateText(body.body, 2000, "Review body");  // 2000 字元限制
const validatedDept = validateText(body.authorDept, 100, "Department");  // 100 字元限制
```

---

## 🔵 Low Severity Issues

### L-1: SQL 查詢字段直接拼接 (潛在風險)

**嚴重程度**: Low
**CVSS 評分**: 3.1
**影響範圍**: `src/app/courses/page.tsx:147, 149`

**問題描述**:
雖然 `sortField` 和 `sortOrder` 有經過白名單驗證，但仍直接拼接到 SQL 查詢中。目前是安全的，但未來如果修改驗證邏輯可能引入風險。

**受影響程式碼**:
```typescript
// src/app/courses/page.tsx:147-149
orderByClause = `ts_rank(c."searchVector", plainto_tsquery('simple', $1)) DESC, c."${sortField}" ${sortOrder.toUpperCase()}`;
// 或
orderByClause = `c."${sortField}" ${sortOrder.toUpperCase()}`;
```

**修復建議**:
使用更明確的白名單映射:

```typescript
const ORDER_BY_MAP: Record<string, string> = {
  'updatedAt-asc': 'c."updatedAt" ASC',
  'updatedAt-desc': 'c."updatedAt" DESC',
  'courseName-asc': 'c."courseName" ASC',
  'courseName-desc': 'c."courseName" DESC',
  // ... 其他組合
};

const orderByKey = `${sortField}-${sortOrder}`;
const orderByClause = ORDER_BY_MAP[orderByKey] || 'c."updatedAt" DESC';
```

---

### L-2: Session 過期時間較長

**嚴重程度**: Low
**CVSS 評分**: 2.7
**影響範圍**: NextAuth 設定

**問題描述**:
Session maxAge 設定為 7 天，如果裝置遺失或被盜，攻擊者可以在 7 天內存取帳戶。

**受影響程式碼**:
```typescript
// src/pages/api/auth/[...nextauth].ts:11-14
session: {
  strategy: "database",
  maxAge: 7 * 24 * 60 * 60, // 7 days
  updateAge: 60 * 60, // 1 hour
},
```

**修復建議**:
根據應用敏感度調整，建議：
- 一般用戶：3 天
- 管理員：1 天或更短

```typescript
session: {
  strategy: "database",
  maxAge: 3 * 24 * 60 * 60, // 3 days
  updateAge: 60 * 60, // 1 hour
},
```

---

### L-3: 缺少 HTTPS 強制重導向

**嚴重程度**: Low
**CVSS 評分**: 2.3

**問題描述**:
沒有強制 HTTPS 重導向機制，如果用戶誤用 HTTP 連線，可能導致中間人攻擊。

**修復建議**:
在 `next.config.js` 新增:

```javascript
async redirects() {
  return [
    {
      source: '/:path*',
      has: [
        {
          type: 'header',
          key: 'x-forwarded-proto',
          value: 'http',
        },
      ],
      destination: 'https://yourdomain.com/:path*',
      permanent: true,
    },
  ];
},
```

或在 Zeabur/Vercel 平台設定自動 HTTPS 重導向。

---

## ✅ Info / 良好實踐

### I-1: 依賴套件安全

**狀態**: ✅ 通過
**掃描結果**: npm audit 顯示 0 個已知漏洞
**依賴數量**: 156 個套件（106 production, 3 dev）

**建議**:
- 定期執行 `npm audit`
- 考慮使用 Dependabot 自動更新依賴
- 監控 GitHub Security Advisories

---

### I-2: 適當的權限控制

**狀態**: ✅ 良好

**優點**:
1. ✅ 所有寫入操作都需要認證
2. ✅ Email 限制為 @nkust.edu.tw
3. ✅ 評論編輯/刪除有所有權檢查
4. ✅ 管理員功能有 role 檢查
5. ✅ 封禁用戶無法操作

**範例**:
```typescript
// src/lib/auth.ts - 集中式權限檢查
export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (user.role !== "ADMIN") throw new Error("Admin access required");
  if (user.bannedAt) throw new Error("User is banned");
  return user;
}
```

---

## 修復優先順序建議

### 立即修復 (本週內)
1. **H-1**: 新增評分數值驗證
2. **H-2**: 移除錯誤訊息中的敏感資訊
3. **M-4**: 新增文字長度限制

### 短期修復 (2 週內)
4. **M-1**: 實作 Rate Limiting
5. **M-2**: 條件式 logging
6. **M-3**: 設定 CSP headers

### 中期改進 (1 個月內)
7. **L-1**: 改進 SQL 查詢構建
8. **L-2**: 調整 session 過期時間
9. **L-3**: HTTPS 強制重導向

---

## 安全性檢查清單

- [x] 依賴套件掃描
- [x] 硬編碼敏感資訊檢查
- [x] SQL Injection 檢查
- [x] XSS 防護檢查
- [x] 權限控制檢查
- [x] 輸入驗證檢查
- [ ] Rate Limiting (缺少)
- [ ] CSP Headers (缺少)
- [ ] 完整的輸入長度驗證 (部分缺少)

---

## 額外建議

### 1. 安全開發生命週期
- 在 CI/CD 中整合 `npm audit`
- 使用 ESLint security plugin
- Code review 時檢查安全問題

### 2. 監控與日誌
- 設定錯誤追蹤 (如 Sentry)
- 記錄安全相關事件（登入失敗、異常請求）
- 定期檢視日誌

### 3. 文件與教育
- 建立安全編碼指南
- 團隊安全意識培訓
- 保持此報告更新

---

**報告產生時間**: 2025-12-27
**下次掃描建議**: 2 週後或重大更新前
**聯絡資訊**: 如發現其他安全問題，請立即通知開發團隊
