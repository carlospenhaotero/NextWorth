import { PrismaClient } from "../src/generated/prisma/client/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create test user (BetterAuth stores password in Account table)
  const user = await prisma.user.upsert({
    where: { email: "test@nextworth.dev" },
    update: {},
    create: {
      name: "Test User",
      email: "test@nextworth.dev",
      emailVerified: true,
      baseCurrency: "USD",
    },
  });

  // Create account with hashed password for BetterAuth
  // Note: In production, use signUp endpoint. This is for dev/testing only.
  // BetterAuth uses bcrypt internally. We'll create via the API in practice.
  console.log(`User created: ${user.email} (id: ${user.id})`);
  console.log(
    "Note: To login, register via /register or use BetterAuth CLI to create credentials."
  );

  // Create assets
  const assets = await Promise.all([
    prisma.asset.upsert({
      where: { symbol_assetType: { symbol: "AAPL", assetType: "stock" } },
      update: {},
      create: { symbol: "AAPL", name: "Apple Inc.", assetType: "stock", currency: "USD" },
    }),
    prisma.asset.upsert({
      where: { symbol_assetType: { symbol: "BTC-USD", assetType: "crypto" } },
      update: {},
      create: { symbol: "BTC-USD", name: "Bitcoin", assetType: "crypto", currency: "USD" },
    }),
    prisma.asset.upsert({
      where: { symbol_assetType: { symbol: "VOO", assetType: "etf" } },
      update: {},
      create: { symbol: "VOO", name: "Vanguard S&P 500 ETF", assetType: "etf", currency: "USD" },
    }),
    prisma.asset.upsert({
      where: { symbol_assetType: { symbol: "GC=F", assetType: "commodity" } },
      update: {},
      create: { symbol: "GC=F", name: "Gold", assetType: "commodity", currency: "USD" },
    }),
    prisma.asset.upsert({
      where: { symbol_assetType: { symbol: "CASH", assetType: "cash" } },
      update: {},
      create: { symbol: "CASH", name: "Cash in bank", assetType: "cash", currency: "EUR" },
    }),
    prisma.asset.upsert({
      where: { symbol_assetType: { symbol: "SAVINGS", assetType: "savings" } },
      update: {},
      create: { symbol: "SAVINGS", name: "Savings account", assetType: "savings", currency: "EUR" },
    }),
  ]);

  console.log(`Created ${assets.length} assets`);

  // Create portfolio positions for test user
  const positions = [
    { assetId: assets[0].id, quantity: 15, avgBuyPrice: 150.0 },
    { assetId: assets[1].id, quantity: 0.5, avgBuyPrice: 30000.0 },
    { assetId: assets[2].id, quantity: 25, avgBuyPrice: 380.0 },
    { assetId: assets[3].id, quantity: 2, avgBuyPrice: 1800.0 },
    { assetId: assets[4].id, quantity: 5000, avgBuyPrice: 1.0 },
    { assetId: assets[5].id, quantity: 10000, avgBuyPrice: 1.0, tae: 3.5 },
  ];

  for (const pos of positions) {
    await prisma.userPortfolio.upsert({
      where: {
        userId_assetId: { userId: user.id, assetId: pos.assetId },
      },
      update: {
        quantity: pos.quantity,
        avgBuyPrice: pos.avgBuyPrice,
        tae: pos.tae ?? null,
      },
      create: {
        userId: user.id,
        assetId: pos.assetId,
        quantity: pos.quantity,
        avgBuyPrice: pos.avgBuyPrice,
        tae: pos.tae ?? null,
      },
    });
  }

  console.log(`Created ${positions.length} portfolio positions`);
  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
