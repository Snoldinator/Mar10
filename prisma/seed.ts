import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const url = process.env["DATABASE_URL"] ?? "file:./prisma/dev.db";
const filePath = url.replace("file:", "");
const dbPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: "admin@mar10.local" } });
  if (!existing) {
    const hashed = await bcrypt.hash("admin123", 12);
    await prisma.user.create({
      data: {
        name: "Admin",
        email: "admin@mar10.local",
        password: hashed,
        role: "ADMIN",
      },
    });
    console.log("Created admin user: admin@mar10.local / admin123");
  } else {
    console.log("Admin user already exists");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
