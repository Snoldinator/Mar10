import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

function getDbPath() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const filePath = url.replace("file:", "");
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({ url: `file:${getDbPath()}` });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
