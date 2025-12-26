#!/usr/bin/env node

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * 清理重複的使用者帳號（因大小寫不同而重複）
 * 只保留大寫版本，並將小寫版本的資料合併過去
 */
async function cleanupDuplicateUsers() {
  try {
    console.log("🔍 檢查重複的使用者帳號...\n");

    // 取得所有使用者
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        bannedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // 找出重複的 email（不區分大小寫）
    const emailMap = new Map();
    const duplicates = [];

    for (const user of allUsers) {
      const normalizedEmail = user.email.toUpperCase();

      if (emailMap.has(normalizedEmail)) {
        duplicates.push({
          normalized: normalizedEmail,
          existing: emailMap.get(normalizedEmail),
          duplicate: user,
        });
      } else {
        emailMap.set(normalizedEmail, user);
      }
    }

    if (duplicates.length === 0) {
      console.log("✓ 沒有發現重複的帳號");
      return;
    }

    console.log(`⚠️  發現 ${duplicates.length} 組重複帳號：\n`);

    for (const dup of duplicates) {
      console.log(`Email: ${dup.normalized}`);
      console.log(`  保留: ${dup.existing.email} (ID: ${dup.existing.id}, 建立於: ${dup.existing.createdAt})`);
      console.log(`  刪除: ${dup.duplicate.email} (ID: ${dup.duplicate.id}, 建立於: ${dup.duplicate.createdAt})`);
      console.log();

      // 決定哪個是正確的帳號（大寫版本）
      const correctUser = dup.existing.email === dup.normalized ? dup.existing : dup.duplicate;
      const incorrectUser = correctUser === dup.existing ? dup.duplicate : dup.existing;

      console.log(`➜ 正確帳號（大寫）: ${correctUser.email} (ID: ${correctUser.id})`);
      console.log(`➜ 錯誤帳號（小寫）: ${incorrectUser.email} (ID: ${incorrectUser.id})`);

      // 開始合併程序
      await prisma.$transaction(async (tx) => {
        // 1. 將錯誤帳號的所有關聯資料轉移到正確帳號

        // 轉移 Reviews
        const reviewCount = await tx.review.updateMany({
          where: { userId: incorrectUser.id },
          data: { userId: correctUser.id },
        });
        console.log(`  ✓ 轉移 ${reviewCount.count} 則評論`);

        // 轉移 HelpfulVotes
        const voteCount = await tx.helpfulVote.updateMany({
          where: { userId: incorrectUser.id },
          data: { userId: correctUser.id },
        });
        console.log(`  ✓ 轉移 ${voteCount.count} 個投票`);

        // 轉移 Reports
        const reportCount = await tx.report.updateMany({
          where: { userId: incorrectUser.id },
          data: { userId: correctUser.id },
        });
        console.log(`  ✓ 轉移 ${reportCount.count} 則檢舉`);

        // 轉移 Comments
        const commentCount = await tx.comment.updateMany({
          where: { userId: incorrectUser.id },
          data: { userId: correctUser.id },
        });
        console.log(`  ✓ 轉移 ${commentCount.count} 則留言`);

        // 轉移 AdminActions (as actor)
        const actorActionCount = await tx.adminAction.updateMany({
          where: { actorId: incorrectUser.id },
          data: { actorId: correctUser.id },
        });
        console.log(`  ✓ 轉移 ${actorActionCount.count} 則管理員操作記錄`);

        // 轉移 AdminActions (as target)
        const targetActionCount = await tx.adminAction.updateMany({
          where: { targetUserId: incorrectUser.id },
          data: { targetUserId: correctUser.id },
        });
        console.log(`  ✓ 轉移 ${targetActionCount.count} 則被管理記錄`);

        // 2. 保留較高的權限等級
        if (incorrectUser.role === "ADMIN" && correctUser.role !== "ADMIN") {
          await tx.user.update({
            where: { id: correctUser.id },
            data: { role: "ADMIN" },
          });
          console.log(`  ✓ 提升權限為 ADMIN`);
        }

        // 3. 刪除錯誤帳號的 Sessions
        const sessionCount = await tx.session.deleteMany({
          where: { userId: incorrectUser.id },
        });
        console.log(`  ✓ 刪除 ${sessionCount.count} 個 session`);

        // 4. 刪除錯誤帳號的 Accounts
        const accountCount = await tx.account.deleteMany({
          where: { userId: incorrectUser.id },
        });
        console.log(`  ✓ 刪除 ${accountCount.count} 個 account`);

        // 5. 最後刪除錯誤的使用者帳號
        await tx.user.delete({
          where: { id: incorrectUser.id },
        });
        console.log(`  ✓ 刪除錯誤帳號 ${incorrectUser.email}`);
      });

      console.log(`✅ 成功合併並刪除 ${incorrectUser.email}\n`);
    }

    console.log(`\n🎉 所有重複帳號已清理完成！`);

  } catch (error) {
    console.error("❌ 清理失敗:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicateUsers();
