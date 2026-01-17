#!/usr/bin/env node
/**
 * Redis 連線診斷腳本
 * 用於測試各種連線配置
 */

import Redis from "ioredis";

const host = process.env.REDIS_HOST;
const port = parseInt(process.env.REDIS_PORT || "6379");
const password = process.env.REDIS_PASSWORD;

if (!host || !password) {
  console.error("❌ 缺少環境變數");
  console.log("請設定: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD");
  process.exit(1);
}

console.log("=== Redis 連線診斷 ===");
console.log(`Host: ${host}`);
console.log(`Port: ${port}`);
console.log(`Password: ${password.substring(0, 4)}...${password.substring(password.length - 4)}`);
console.log(`TLS 環境變數: ${process.env.REDIS_TLS || "未設定"}`);
console.log("");

// 測試配置列表
const configs = [
  { name: "無 TLS", tls: undefined },
  { name: "TLS (rejectUnauthorized: false)", tls: { rejectUnauthorized: false } },
  { name: "TLS (rejectUnauthorized: true)", tls: { rejectUnauthorized: true } },
];

async function testConnection(name, tlsConfig) {
  console.log(`\n🔄 測試: ${name}`);

  const redis = new Redis({
    host,
    port,
    password,
    tls: tlsConfig,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // 不重試
    connectTimeout: 5000,
    lazyConnect: true,
  });

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log(`   ⏱️ 連線逾時`);
      redis.disconnect();
      resolve(false);
    }, 6000);

    redis.on("error", (err) => {
      clearTimeout(timeout);
      console.log(`   ❌ 錯誤: ${err.message}`);
      redis.disconnect();
      resolve(false);
    });

    redis.connect().then(async () => {
      try {
        const pong = await redis.ping();
        clearTimeout(timeout);
        console.log(`   ✅ 連線成功! PING 回應: ${pong}`);

        // 測試讀寫
        await redis.set("__test__", "ok", "EX", 10);
        const val = await redis.get("__test__");
        console.log(`   ✅ 讀寫測試: ${val}`);
        await redis.del("__test__");

        redis.disconnect();
        resolve(true);
      } catch (err) {
        clearTimeout(timeout);
        console.log(`   ❌ 操作失敗: ${err.message}`);
        redis.disconnect();
        resolve(false);
      }
    }).catch((err) => {
      clearTimeout(timeout);
      console.log(`   ❌ 連線失敗: ${err.message}`);
      redis.disconnect();
      resolve(false);
    });
  });
}

async function main() {
  let success = false;

  for (const config of configs) {
    const result = await testConnection(config.name, config.tls);
    if (result) {
      success = true;
      console.log(`\n✅ 成功的配置: ${config.name}`);
      break;
    }
  }

  if (!success) {
    console.log("\n❌ 所有配置都失敗了");
    console.log("\n可能的原因:");
    console.log("1. Redis 服務未啟動或無法訪問");
    console.log("2. 防火牆阻擋了連接");
    console.log("3. Host/Port 不正確");
    console.log("4. 密碼不正確");
    console.log("\n建議:");
    console.log("- 確認 Zeabur Redis 服務正在運行");
    console.log("- 確認 Host 和 Port 來自 Zeabur 控制台");
    console.log("- 嘗試在 Zeabur 控制台重新生成密碼");
  }

  process.exit(success ? 0 : 1);
}

main();
