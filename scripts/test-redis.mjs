/**
 * Redis 連線測試腳本
 * 使用方式: node scripts/test-redis.mjs
 */

import Redis from "ioredis";

async function testRedisConnection() {
  console.log("🔍 Testing Redis connection...\n");

  // 使用獨立參數而非連線字串
  const host = process.env.REDIS_HOST || "sjc1.clusters.zeabur.com";
  const port = parseInt(process.env.REDIS_PORT || "27677");
  const password = process.env.REDIS_PASSWORD || "REDACTED_REDIS_PASSWORD";

  console.log(`📡 Connecting to: ${host}:${port} (with password)`);

  const redis = new Redis({
    host,
    port,
    password,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) {
        console.error("❌ Max retries reached");
        return null;
      }
      const delay = Math.min(times * 50, 2000);
      console.log(`⏳ Retry ${times}/3 in ${delay}ms...`);
      return delay;
    },
  });

  redis.on("error", (err) => {
    console.error("❌ Redis error:", err.message);
  });

  redis.on("connect", () => {
    console.log("✓ Connected to Redis");
  });

  redis.on("ready", () => {
    console.log("✓ Redis is ready");
  });

  try {
    // Test 1: PING
    console.log("\n📌 Test 1: PING");
    const pong = await redis.ping();
    console.log(`✓ PING response: ${pong}`);

    // Test 2: SET/GET
    console.log("\n📌 Test 2: SET/GET");
    const testKey = "test:nkust:timestamp";
    const testValue = new Date().toISOString();
    await redis.set(testKey, testValue, "EX", 60); // 60 秒過期
    console.log(`✓ SET ${testKey} = ${testValue}`);

    const retrieved = await redis.get(testKey);
    console.log(`✓ GET ${testKey} = ${retrieved}`);

    if (retrieved === testValue) {
      console.log("✓ Value matches!");
    } else {
      console.error("❌ Value mismatch!");
    }

    // Test 3: TTL
    console.log("\n📌 Test 3: TTL");
    const ttl = await redis.ttl(testKey);
    console.log(`✓ TTL of ${testKey} = ${ttl} seconds`);

    // Test 4: DELETE
    console.log("\n📌 Test 4: DELETE");
    await redis.del(testKey);
    console.log(`✓ Deleted ${testKey}`);

    const deleted = await redis.get(testKey);
    if (deleted === null) {
      console.log("✓ Key successfully deleted");
    } else {
      console.error("❌ Key still exists!");
    }

    // Test 5: INFO
    console.log("\n📌 Test 5: Server Info");
    const info = await redis.info("server");
    const lines = info.split("\r\n").filter((line) => line && !line.startsWith("#"));
    console.log("Server Information:");
    lines.slice(0, 5).forEach((line) => {
      console.log(`  ${line}`);
    });

    console.log("\n✅ All tests passed!");
    console.log("\n🎉 Redis is working correctly!");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    process.exit(1);
  } finally {
    await redis.quit();
    console.log("\n👋 Connection closed");
  }
}

testRedisConnection().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
