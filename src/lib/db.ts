import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
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


