import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";

  if (databaseUrl.startsWith("file:")) {
    const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
    return new PrismaClient({ adapter, log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"] });
  }

  // For MySQL in production — Prisma 7 still supports MySQL via built-in connector?
  // If MySQL adapter needed: @prisma/adapter-mysql
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
