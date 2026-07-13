/**
 * Seed de CARGA para NextWorth (Fase 3, test de carga del roadmap).
 *
 * Crea un usuario dedicado con 1000 posiciones para medir el comportamiento de
 * la cartera a escala. La mezcla incluye ~300 activos de mercado (que disparan
 * quote + FX por posición) para exponer el N+1 conocido de getPortfolioForUser,
 * y ~700 activos sin red (cash/savings/bond) para medir el coste de DB+cómputo.
 *
 * Los símbolos son sintéticos: no existen en Yahoo, así que el quote falla rápido
 * y la posición cae a coste. Lo que medimos es la ESTRUCTURA (llamadas
 * secuenciales por posición), no la latencia de un símbolo concreto.
 *
 * Ejecutar:  pnpm db:seed:load   (requiere la DB de DATABASE_URL levantada)
 * Medir:     pnpm loadtest
 * Limpiar:   se re-siembra de forma idempotente; borra el usuario para resetear.
 */
import { PrismaClient } from "../src/generated/prisma/client/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

export const LOAD_EMAIL = "loadtest@nextworth.app";
const PASSWORD = "LoadTest2026!";
const NAME = "Load Test User";

const TOTAL = Number(process.env.LOAD_N ?? 1000);
const MARKET = Number(process.env.LOAD_MARKET ?? 300);

const DAY_MS = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS);

const MARKET_TYPES = ["stock", "etf", "crypto", "commodity"] as const;
const CURRENCIES = ["USD", "EUR", "GBP"] as const;
const pad = (n: number) => String(n).padStart(4, "0");

type AssetSeed = { symbol: string; name: string; assetType: string; currency: string };
type PositionSeed = {
  symbol: string;
  assetType: string;
  quantity: number;
  avgBuyPrice?: number;
  tae?: number;
  faceValue?: number;
  couponRate?: number;
  maturityDate?: Date;
  createdAt: Date;
};

function buildSeed(): { assets: AssetSeed[]; positions: PositionSeed[] } {
  const assets: AssetSeed[] = [];
  const positions: PositionSeed[] = [];

  for (let i = 0; i < TOTAL; i++) {
    const isMarket = i < MARKET;
    const currency = CURRENCIES[i % CURRENCIES.length];
    const createdAt = daysAgo(30 + (i % 700));

    if (isMarket) {
      const assetType = MARKET_TYPES[i % MARKET_TYPES.length];
      const symbol = `LOAD${assetType.toUpperCase().slice(0, 3)}${pad(i)}`;
      assets.push({ symbol, name: `Load ${assetType} ${i}`, assetType, currency });
      positions.push({
        symbol,
        assetType,
        quantity: 1 + (i % 50),
        avgBuyPrice: 10 + (i % 500),
        createdAt,
      });
      continue;
    }

    // Non-market: cycle cash / savings / bond.
    const kind = i % 3;
    if (kind === 0) {
      const symbol = `LOADCASH${pad(i)}`;
      assets.push({ symbol, name: `Load cash ${i}`, assetType: "cash", currency });
      positions.push({ symbol, assetType: "cash", quantity: 1000 + i, avgBuyPrice: 1, createdAt });
    } else if (kind === 1) {
      const symbol = `LOADSAV${pad(i)}`;
      assets.push({ symbol, name: `Load savings ${i}`, assetType: "savings", currency });
      positions.push({ symbol, assetType: "savings", quantity: 2000 + i, tae: 2 + (i % 4), createdAt });
    } else {
      const symbol = `LOADBOND${pad(i)}`;
      assets.push({ symbol, name: `Load bond ${i}`, assetType: "bond", currency });
      positions.push({
        symbol,
        assetType: "bond",
        quantity: 5 + (i % 20),
        faceValue: 1000,
        couponRate: 3 + (i % 3),
        avgBuyPrice: 950,
        maturityDate: daysAgo(-365 * (1 + (i % 5))),
        createdAt,
      });
    }
  }

  return { assets, positions };
}

async function main() {
  console.log(`Seeding load account with ${TOTAL} positions (${MARKET} market)...`);

  const passwordHash = await hashPassword(PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: LOAD_EMAIL },
    update: { name: NAME, emailVerified: true, baseCurrency: "USD" },
    create: { name: NAME, email: LOAD_EMAIL, emailVerified: true, baseCurrency: "USD" },
  });

  const existingAccount = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });
  if (existingAccount) {
    await prisma.account.update({ where: { id: existingAccount.id }, data: { password: passwordHash } });
  } else {
    await prisma.account.create({
      data: { userId: user.id, accountId: user.id, providerId: "credential", password: passwordHash },
    });
  }

  const { assets, positions } = buildSeed();

  // Bulk-create assets, then load the id map in one query.
  await prisma.asset.createMany({
    data: assets.map((a) => ({ symbol: a.symbol, name: a.name, assetType: a.assetType, currency: a.currency })),
    skipDuplicates: true,
  });
  const symbols = assets.map((a) => a.symbol);
  const created = await prisma.asset.findMany({
    where: { symbol: { in: symbols } },
    select: { id: true, symbol: true },
  });
  const idBySymbol = new Map(created.map((a) => [a.symbol, a.id]));

  // Reset this user's positions, then bulk-create the fresh set.
  await prisma.userPortfolio.deleteMany({ where: { userId: user.id } });
  await prisma.userPortfolio.createMany({
    data: positions.map((p) => ({
      userId: user.id,
      assetId: idBySymbol.get(p.symbol)!,
      quantity: p.quantity,
      avgBuyPrice: p.avgBuyPrice ?? null,
      tae: p.tae ?? null,
      faceValue: p.faceValue ?? null,
      couponRate: p.couponRate ?? null,
      maturityDate: p.maturityDate ?? null,
      createdAt: p.createdAt,
    })),
  });

  const count = await prisma.userPortfolio.count({ where: { userId: user.id } });
  console.log(`Done. User ${user.email} (id ${user.id}) now holds ${count} positions.`);
}

main()
  .catch((e) => {
    console.error("Load seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
