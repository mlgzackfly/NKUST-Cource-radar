import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prisma } from "@/lib/db";
// @ts-expect-error - Next.js 15.5.9/Prisma type definition issue
import type { User } from "@prisma/client";

/**
 * 取得當前登入的使用者資料
 * 驗證 @nkust.edu.tw email 並回傳完整 User 資料
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  if (!session.user.email.toLowerCase().endsWith("@nkust.edu.tw")) return null;

  return await prisma!.user.findUnique({
    where: { email: session.user.email },
  });
}

/**
 * 要求管理員權限
 * 如果使用者不是管理員，拋出錯誤
 * @throws {Error} "Unauthorized" | "Admin access required" | "User is banned"
 */
export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (user.role !== "ADMIN") throw new Error("Admin access required");
  if (user.bannedAt) throw new Error("User is banned");
  return user;
}

/**
 * 要求高科大使用者權限（已登入且未被封禁）
 * @throws {Error} "Unauthorized" | "User is banned"
 */
export async function requireNkustUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (user.bannedAt) throw new Error("User is banned");
  return user;
}

/**
 * 檢查使用者是否為管理員
 * 不拋出錯誤，回傳 boolean
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    return user?.role === "ADMIN" && !user.bannedAt;
  } catch {
    return false;
  }
}
