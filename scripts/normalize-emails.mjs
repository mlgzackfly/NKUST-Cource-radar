#!/usr/bin/env node
/**
 * 將所有 email 轉換為小寫
 * 處理重複帳號（大小寫不同但本質相同的 email）
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("開始檢查需要正規化的 email...\n");

  // 找出所有使用者
  const users = await prisma.user.findMany({
    include: {
      accounts: true,
      sessions: true,
      reviews: true,
      helpfulVotes: true,
      reports: true,
    },
  });

  console.log(`共找到 ${users.length} 位使用者\n`);

  // 分組：找出相同 email（忽略大小寫）的使用者
  const emailGroups = new Map();
  for (const user of users) {
    if (!user.email) continue;
    const lowerEmail = user.email.toLowerCase();
    if (!emailGroups.has(lowerEmail)) {
      emailGroups.set(lowerEmail, []);
    }
    emailGroups.get(lowerEmail).push(user);
  }

  // 處理每個 email 群組
  let updatedCount = 0;
  let mergedCount = 0;

  for (const [lowerEmail, groupUsers] of emailGroups) {
    if (groupUsers.length === 1) {
      // 單一使用者：只需更新 email 為小寫
      const user = groupUsers[0];
      if (user.email !== lowerEmail) {
        console.log(`更新: ${user.email} -> ${lowerEmail}`);
        await prisma.user.update({
          where: { id: user.id },
          data: { email: lowerEmail },
        });
        updatedCount++;
      }
    } else {
      // 多個使用者：需要合併
      console.log(`\n發現重複帳號 (${lowerEmail}):`);
      groupUsers.forEach((u, i) => {
        console.log(
          `  ${i + 1}. ID: ${u.id}, Email: ${u.email}, Role: ${u.role}, Reviews: ${u.reviews.length}`
        );
      });

      // 選擇主帳號：優先保留有 ADMIN 權限或有更多資料的
      const sortedUsers = groupUsers.sort((a, b) => {
        // 優先保留 ADMIN
        if (a.role === "ADMIN" && b.role !== "ADMIN") return -1;
        if (b.role === "ADMIN" && a.role !== "ADMIN") return 1;
        // 其次保留有更多評論的
        if (a.reviews.length !== b.reviews.length) {
          return b.reviews.length - a.reviews.length;
        }
        // 再次保留有更多 accounts 的（OAuth 連結）
        if (a.accounts.length !== b.accounts.length) {
          return b.accounts.length - a.accounts.length;
        }
        // 最後保留較早建立的
        return new Date(a.createdAt) - new Date(b.createdAt);
      });

      const primaryUser = sortedUsers[0];
      const secondaryUsers = sortedUsers.slice(1);

      console.log(`  -> 保留帳號: ${primaryUser.id} (${primaryUser.email})`);

      // 合併次要帳號的資料到主帳號
      for (const secondaryUser of secondaryUsers) {
        console.log(`  -> 合併帳號: ${secondaryUser.id} (${secondaryUser.email})`);

        // 轉移 reviews
        if (secondaryUser.reviews.length > 0) {
          await prisma.review.updateMany({
            where: { userId: secondaryUser.id },
            data: { userId: primaryUser.id },
          });
          console.log(`     - 轉移 ${secondaryUser.reviews.length} 則評論`);
        }

        // 轉移 helpfulVotes
        if (secondaryUser.helpfulVotes.length > 0) {
          // 檢查是否有重複投票
          const primaryVotes = await prisma.helpfulVote.findMany({
            where: { userId: primaryUser.id },
          });
          const primaryVoteReviewIds = new Set(primaryVotes.map((v) => v.reviewId));

          for (const vote of secondaryUser.helpfulVotes) {
            if (primaryVoteReviewIds.has(vote.reviewId)) {
              // 已有投票，刪除次要帳號的
              await prisma.helpfulVote.delete({
                where: { id: vote.id },
              });
            } else {
              // 轉移投票
              await prisma.helpfulVote.update({
                where: { id: vote.id },
                data: { userId: primaryUser.id },
              });
            }
          }
          console.log(`     - 處理 ${secondaryUser.helpfulVotes.length} 個投票`);
        }

        // 轉移 reports
        if (secondaryUser.reports.length > 0) {
          await prisma.report.updateMany({
            where: { userId: secondaryUser.id },
            data: { userId: primaryUser.id },
          });
          console.log(`     - 轉移 ${secondaryUser.reports.length} 則檢舉`);
        }

        // 轉移 accounts（OAuth 連結）
        if (secondaryUser.accounts.length > 0) {
          for (const account of secondaryUser.accounts) {
            // 檢查是否已存在相同 provider 的帳號
            const existingAccount = await prisma.account.findFirst({
              where: {
                userId: primaryUser.id,
                provider: account.provider,
              },
            });
            if (existingAccount) {
              // 刪除重複的
              await prisma.account.delete({
                where: { id: account.id },
              });
            } else {
              // 轉移
              await prisma.account.update({
                where: { id: account.id },
                data: { userId: primaryUser.id },
              });
            }
          }
          console.log(`     - 處理 ${secondaryUser.accounts.length} 個 OAuth 連結`);
        }

        // 刪除次要帳號的 sessions
        await prisma.session.deleteMany({
          where: { userId: secondaryUser.id },
        });

        // 刪除次要帳號
        await prisma.user.delete({
          where: { id: secondaryUser.id },
        });
        console.log(`     - 已刪除次要帳號`);
        mergedCount++;
      }

      // 更新主帳號 email 為小寫
      if (primaryUser.email !== lowerEmail) {
        await prisma.user.update({
          where: { id: primaryUser.id },
          data: { email: lowerEmail },
        });
        updatedCount++;
      }

      // 如果次要帳號有 ADMIN 權限，確保主帳號也有
      const hadAdmin = sortedUsers.some((u) => u.role === "ADMIN");
      if (hadAdmin && primaryUser.role !== "ADMIN") {
        await prisma.user.update({
          where: { id: primaryUser.id },
          data: { role: "ADMIN" },
        });
        console.log(`     - 設定為管理員`);
      }
    }
  }

  console.log(`\n完成！`);
  console.log(`- 更新 ${updatedCount} 個 email 為小寫`);
  console.log(`- 合併 ${mergedCount} 個重複帳號`);
}

main()
  .catch((e) => {
    console.error("錯誤:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
