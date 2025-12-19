# 登入連結收不到問題診斷

## 快速檢查清單

### 1️⃣ Zeabur 環境變數設定 ⚠️ **最常見問題**

**檢查步驟：**
1. 打開 Zeabur 控制台
2. 進入您的服務
3. 點擊 **Variables** 標籤
4. 確認以下環境變數**全部都有設定**：

```bash
RESEND_API_KEY=re_xxxxxxxxxx
EMAIL_FROM=noreply@fenryx.tech
NEXTAUTH_URL=https://your-app.zeabur.app
NEXTAUTH_SECRET=xxxxxxxxxxxxxxxx
DATABASE_URL=postgresql://...
```

**❌ 常見錯誤：**
- `.env.local` 文件只在本地有效，不會自動同步到 Zeabur
- 必須在 Zeabur 控制台手動添加環境變數
- 修改環境變數後需要**重新部署**

---

### 2️⃣ Resend Domain 驗證

您目前使用的 domain：`fenryx.tech`

**檢查步驟：**
1. 登入 [Resend Dashboard](https://resend.com/domains)
2. 檢查 `fenryx.tech` 狀態是否為 **Verified** ✓

**如果未驗證：**
- 添加 Resend 提供的 DNS 記錄到您的域名服務商
- 等待 DNS 傳播（可能需要幾分鐘到幾小時）

**替代方案（快速測試）：**
使用 Resend 提供的測試 domain：
```
EMAIL_FROM=onboarding@resend.dev
```
⚠️ 這個只能用於測試，不能用於生產環境

---

### 3️⃣ 檢查 Zeabur 應用日誌

**步驟：**
1. Zeabur 控制台 → 您的服務 → **Logs** 標籤
2. 嘗試登入
3. 查找以下日誌：

**正常日誌：**
```
=== sendVerificationRequest called ===
Email (original): c109193108@nkust.edu.tw
Email (normalized): C109193108@nkust.edu.tw
✓ Email validation passed
Sending email via Resend...
✓ Email sent successfully!
```

**錯誤日誌範例：**
```
❌ Failed to send email: Missing API key
❌ Failed to send email: Domain not verified
❌ Failed to send email: Invalid recipient
```

---

### 4️⃣ Resend API Key 權限

**檢查步驟：**
1. 登入 [Resend Dashboard](https://resend.com/api-keys)
2. 確認您的 API Key：
   - 狀態：**Active**
   - 權限：**Sending access**
3. 如果不確定，重新生成一個新的 API Key

---

### 5️⃣ 郵件被過濾

**如果以上都正常，但還是收不到：**

1. **檢查垃圾郵件資料夾**
   - 高科大信箱可能會將外部郵件標記為垃圾郵件

2. **檢查郵件伺服器規則**
   - 某些學校郵件系統會封鎖外部自動化郵件
   - 嘗試用其他 @nkust.edu.tw 信箱測試

3. **查看 Resend Logs**
   - [Resend Dashboard](https://resend.com/emails) → Emails
   - 查看郵件是否成功發送（狀態應為 "Delivered"）
   - 如果顯示 "Bounced" 或 "Rejected"，點擊查看原因

---

## 🔧 快速修復步驟

### Step 1: 設定 Zeabur 環境變數

```bash
# 在 Zeabur Variables 中添加：
RESEND_API_KEY=REDACTED_RESEND_API_KEY
EMAIL_FROM=noreply@fenryx.tech
NEXTAUTH_URL=https://your-app.zeabur.app  # 改成您的實際網址
NEXTAUTH_SECRET=REDACTED_NEXTAUTH_SECRET
```

### Step 2: 重新部署

在 Zeabur 控制台點擊 **Redeploy** 或推送新 commit 觸發部署

### Step 3: 測試

1. 訪問 `https://your-app.zeabur.app/auth/signin`
2. 輸入您的 @nkust.edu.tw 信箱
3. 點擊「傳送登入連結」
4. 查看 Zeabur Logs

---

## 🧪 測試郵件發送（可選）

建立測試腳本驗證 Resend 配置：

```bash
# 在本地運行
node scripts/test-email.mjs
```

如果測試成功但網站還是收不到，問題在於 Zeabur 環境變數未設定。

---

## 常見問題 Q&A

### Q1: 為什麼本地可以收到，Zeabur 收不到？
**A**: `.env.local` 只在本地有效。必須在 Zeabur 控制台設定環境變數。

### Q2: 我設定了環境變數，為什麼還是不行？
**A**: 修改環境變數後必須**重新部署**應用。

### Q3: 可以用 Gmail 發送嗎？
**A**: 不建議。Resend 是專為應用郵件設計的服務，Gmail SMTP 可能被封鎖或限流。

### Q4: fenryx.tech 是什麼？
**A**: 這是您在 Resend 設定的發件 domain。必須在 Resend 中驗證才能使用。

### Q5: 我可以改成其他郵件服務嗎？
**A**: 可以，但需要修改 NextAuth 配置。Resend 是最簡單的方案。

---

## 📞 仍然無法解決？

請提供以下資訊：

1. ✅ Zeabur 環境變數截圖（**遮蔽敏感資訊**）
2. ✅ Zeabur Logs 中與登入相關的日誌
3. ✅ Resend Dashboard 中郵件發送狀態
4. ✅ 使用的信箱（完整 email）
5. ✅ 是否檢查過垃圾郵件資料夾

---

**最後更新：** 2024-12-19
