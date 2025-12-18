#!/usr/bin/env node
import { config } from 'dotenv';

// 載入環境變數
config({ path: '.env.local' });

const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'EMAIL_FROM',
  'RESEND_API_KEY',
];

console.log('🔍 檢查環境變數...\n');

let hasError = false;

for (const varName of requiredEnvVars) {
  if (process.env[varName]) {
    console.log(`✓ ${varName}: 已設定`);
  } else {
    console.error(`✗ ${varName}: 未設定`);
    hasError = true;
  }
}

console.log('\n');

if (hasError) {
  console.error('❌ 部分環境變數未設定，請檢查 .env.local 檔案');
  process.exit(1);
} else {
  console.log('✅ 所有必要環境變數已設定');
}
