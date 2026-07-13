/**
 * One-off: restore the demo account password to its canonical value after
 * manual change-password testing. Touches only the credential account row,
 * never the portfolio.
 */
import { PrismaClient } from "../src/generated/prisma/client/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const EMAIL = "demo-e2e@nextworth.app";
const PASSWORD = "NextWorth2026!";

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) throw new Error("demo user not found");
  const account = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });
  if (!account) throw new Error("credential account not found");
  await prisma.account.update({
    where: { id: account.id },
    data: { password: await hashPassword(PASSWORD) },
  });
  // Clear any lingering sessions so the loop-inducing stale cookie dies too.
  await prisma.session.deleteMany({ where: { userId: user.id } });
  console.log("demo password restored + sessions cleared");
}

main().finally(() => prisma.$disconnect());
