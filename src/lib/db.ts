import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient | null = (() => {
  // Allow the app to boot without a configured DB (useful for first-time setup / CI).
  if (!process.env.DATABASE_URL) return null;

  const client =
    globalThis.__prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });

  if (process.env.NODE_ENV === "development") globalThis.__prisma = client;
  return client;
})();

export function requirePrisma(): PrismaClient {
  if (!prisma) throw new Error("DATABASE_URL is not set. Configure PostgreSQL first.");
  return prisma;
}

/**
 * 執行原始 SQL 查詢的 tagged template 函數
 * 使用 Prisma 的 $queryRawUnsafe 來執行 SQL
 */
export async function prismaRaw<T>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T> {
  if (!prisma) throw new Error("DATABASE_URL is not set. Configure PostgreSQL first.");
  const sql = strings.join("?");
  const result = await prisma.$queryRawUnsafe(sql, ...values);
  return result as T;
}
