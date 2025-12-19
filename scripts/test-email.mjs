#!/usr/bin/env node
/**
 * 測試 Resend 郵件發送
 *
 * 用途：驗證 RESEND_API_KEY 和 EMAIL_FROM 配置是否正確
 *
 * 使用方法：
 * node scripts/test-email.mjs your-email@nkust.edu.tw
 */

import { config } from 'dotenv';
import { Resend } from 'resend';

config({ path: '.env.local' });

const recipientEmail = process.argv[2];

if (!recipientEmail) {
  console.error('❌ 請提供收件人 email');
  console.error('使用方法: node scripts/test-email.mjs your-email@nkust.edu.tw');
  process.exit(1);
}

if (!recipientEmail.toLowerCase().endsWith('@nkust.edu.tw')) {
  console.error('❌ 請使用 @nkust.edu.tw 信箱');
  process.exit(1);
}

async function testEmail() {
  console.log('📧 測試 Resend 郵件發送\n');

  // 檢查環境變數
  console.log('1️⃣ 檢查環境變數...');
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY 未設定');
    console.error('   請在 .env.local 中設定 RESEND_API_KEY\n');
    process.exit(1);
  }
  console.log(`✓ RESEND_API_KEY: ${process.env.RESEND_API_KEY.substring(0, 10)}...`);

  if (!process.env.EMAIL_FROM) {
    console.error('❌ EMAIL_FROM 未設定');
    console.error('   請在 .env.local 中設定 EMAIL_FROM\n');
    process.exit(1);
  }
  console.log(`✓ EMAIL_FROM: ${process.env.EMAIL_FROM}\n`);

  // 初始化 Resend
  console.log('2️⃣ 初始化 Resend...');
  const resend = new Resend(process.env.RESEND_API_KEY);
  console.log('✓ Resend 已初始化\n');

  // 發送測試郵件
  console.log('3️⃣ 發送測試郵件...');
  console.log(`   收件人: ${recipientEmail}`);
  console.log(`   發件人: ${process.env.EMAIL_FROM}\n`);

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: recipientEmail,
      subject: '【測試】高科選課雷達 - 郵件測試',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0070f3;">✅ 郵件配置測試成功</h2>
          <p>恭喜！您的 Resend 郵件配置正確。</p>

          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>配置資訊：</strong></p>
            <p style="margin: 8px 0 0 0; font-family: monospace; font-size: 14px;">
              發件人: ${process.env.EMAIL_FROM}<br>
              收件人: ${recipientEmail}<br>
              測試時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
            </p>
          </div>

          <p style="color: #666; font-size: 14px;">
            這是一封測試郵件，用於驗證高科選課雷達的郵件發送功能。<br>
            如果您收到此郵件，代表系統已正確配置。
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">

          <p style="font-size: 12px; color: #999;">
            高科選課雷達 | 選課，不只是憑感覺
          </p>
        </div>
      `,
    });

    console.log('✅ 郵件發送成功！\n');
    console.log('📋 Resend 回應：');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n📬 後續步驟：');
    console.log('   1. 檢查收件匣（可能需要等待幾秒）');
    console.log('   2. 如果沒收到，檢查垃圾郵件資料夾');
    console.log('   3. 前往 Resend Dashboard 查看發送狀態：');
    console.log('      https://resend.com/emails\n');

  } catch (error) {
    console.error('\n❌ 郵件發送失敗\n');
    console.error('錯誤訊息:', error.message);

    if (error.message.includes('API key')) {
      console.error('\n💡 可能原因：');
      console.error('   • RESEND_API_KEY 無效或已過期');
      console.error('   • API Key 權限不足');
      console.error('\n🔧 解決方法：');
      console.error('   1. 登入 https://resend.com/api-keys');
      console.error('   2. 重新生成 API Key');
      console.error('   3. 更新 .env.local 中的 RESEND_API_KEY\n');
    } else if (error.message.includes('domain') || error.message.includes('from')) {
      console.error('\n💡 可能原因：');
      console.error('   • EMAIL_FROM 的 domain 未在 Resend 中驗證');
      console.error('\n🔧 解決方法：');
      console.error('   1. 登入 https://resend.com/domains');
      console.error('   2. 確認 domain 狀態為 "Verified"');
      console.error('   3. 或暫時使用測試 domain: onboarding@resend.dev\n');
    } else {
      console.error('\n🔍 完整錯誤：');
      console.error(error);
    }

    process.exit(1);
  }
}

testEmail();
