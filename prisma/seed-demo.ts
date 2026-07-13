/**
 * Seed de cuenta DEMO para NextWorth.
 *
 * Crea (o actualiza de forma idempotente) un usuario con login real por
 * email+password gestionado por BetterAuth, y una cartera variada para
 * que cualquiera pueda entrar y ver la plataforma poblada.
 *
 * Credenciales:
 *   email:    demo-e2e@nextworth.app
 *   password: NextWorth2026!
 *
 * Ejecutar:
 *   pnpm db:seed:demo
 *
 * Requiere que la base de datos apuntada por DATABASE_URL (.env.local)
 * esté levantada (docker compose up -d).
 */
import { PrismaClient } from "../src/generated/prisma/client/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const EMAIL = "demo-e2e@nextworth.app";
const PASSWORD = "NextWorth2026!";
const NAME = "Demo User";

const DAY_MS = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS);
const yearsFromNow = (n: number) => new Date(Date.now() + n * 365 * DAY_MS);

// Catalogo de assets para la demo. assetType/currency reflejan como los guarda la app.
const ASSETS = [
  { symbol: "AAPL", name: "Apple Inc.", assetType: "stock", currency: "USD" },
  { symbol: "MSFT", name: "Microsoft Corp.", assetType: "stock", currency: "USD" },
  { symbol: "NVDA", name: "NVIDIA Corp.", assetType: "stock", currency: "USD" },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", assetType: "etf", currency: "USD" },
  { symbol: "VWCE.DE", name: "Vanguard FTSE All-World UCITS", assetType: "etf", currency: "EUR" },
  { symbol: "BTC-USD", name: "Bitcoin", assetType: "crypto", currency: "USD" },
  { symbol: "ETH-USD", name: "Ethereum", assetType: "crypto", currency: "USD" },
  { symbol: "GC=F", name: "Gold", assetType: "commodity", currency: "USD" },
  { symbol: "CASH", name: "Cuenta corriente", assetType: "cash", currency: "EUR" },
  { symbol: "SAVINGS", name: "Cuenta remunerada", assetType: "savings", currency: "EUR" },
  { symbol: "BUND10Y", name: "Bono aleman 10A", assetType: "bond", currency: "EUR" },
] as const;

// Posiciones indexadas por simbolo. createdAt escalonado para que la grafica
// de patrimonio muestre entradas repartidas a lo largo de ~11 meses.
type PositionSeed = {
  symbol: string;
  quantity: number;
  avgBuyPrice?: number;
  createdAt: Date;
  tae?: number;
  faceValue?: number;
  couponRate?: number;
  couponFrequency?: number;
  maturityDate?: Date;
};

const POSITIONS: PositionSeed[] = [
  { symbol: "CASH", quantity: 6000, avgBuyPrice: 1, createdAt: daysAgo(330) },
  { symbol: "AAPL", quantity: 18, avgBuyPrice: 160, createdAt: daysAgo(310) },
  { symbol: "VOO", quantity: 22, avgBuyPrice: 410, createdAt: daysAgo(280) },
  { symbol: "SAVINGS", quantity: 15000, avgBuyPrice: 1, tae: 3.1, createdAt: daysAgo(260) },
  { symbol: "BTC-USD", quantity: 0.25, avgBuyPrice: 65000, createdAt: daysAgo(220) },
  { symbol: "GC=F", quantity: 2, avgBuyPrice: 2200, createdAt: daysAgo(190) },
  { symbol: "MSFT", quantity: 10, avgBuyPrice: 400, createdAt: daysAgo(160) },
  { symbol: "NVDA", quantity: 35, avgBuyPrice: 120, createdAt: daysAgo(130) },
  { symbol: "ETH-USD", quantity: 3, avgBuyPrice: 3200, createdAt: daysAgo(100) },
  { symbol: "VWCE.DE", quantity: 30, avgBuyPrice: 115, createdAt: daysAgo(70) },
  {
    symbol: "BUND10Y",
    quantity: 8,
    avgBuyPrice: 960,
    faceValue: 1000,
    couponRate: 2.75,
    couponFrequency: 1,
    maturityDate: yearsFromNow(6),
    createdAt: daysAgo(40),
  },
];

async function main() {
  console.log("Seeding demo account...");

  const passwordHash = await hashPassword(PASSWORD);

  // Upsert de usuario demo (idempotente).
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {
      name: NAME,
      emailVerified: true,
      baseCurrency: "EUR",
    },
    create: {
      name: NAME,
      email: EMAIL,
      emailVerified: true,
      baseCurrency: "EUR",
    },
  });
  console.log(`Usuario demo: ${user.email} (id: ${user.id})`);

  // Upsert de la cuenta credential con el hash de password compatible con BetterAuth.
  const existingAccount = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });

  if (existingAccount) {
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: { password: passwordHash },
    });
  } else {
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: passwordHash,
      },
    });
  }
  console.log("Credenciales de login (email+password) listas.");

  // Upsert de assets y mapa simbolo -> id.
  const assetIdBySymbol = new Map<string, number>();
  for (const a of ASSETS) {
    const asset = await prisma.asset.upsert({
      where: { symbol_assetType: { symbol: a.symbol, assetType: a.assetType } },
      update: { name: a.name, currency: a.currency },
      create: { symbol: a.symbol, name: a.name, assetType: a.assetType, currency: a.currency },
    });
    assetIdBySymbol.set(a.symbol, asset.id);
  }
  console.log(`Assets listos: ${ASSETS.length}`);

  for (const p of POSITIONS) {
    const assetId = assetIdBySymbol.get(p.symbol)!;
    const data = {
      quantity: p.quantity,
      avgBuyPrice: p.avgBuyPrice ?? null,
      tae: p.tae ?? null,
      faceValue: p.faceValue ?? null,
      couponRate: p.couponRate ?? null,
      couponFrequency: p.couponFrequency ?? null,
      maturityDate: p.maturityDate ?? null,
      createdAt: p.createdAt,
    };
    await prisma.userPortfolio.upsert({
      where: { userId_assetId: { userId: user.id, assetId } },
      update: data,
      create: { userId: user.id, assetId, ...data },
    });
  }
  console.log(`Posiciones creadas/actualizadas: ${POSITIONS.length}`);

  console.log("Seed de la cuenta demo completado.");
  console.log("---");
  console.log(`Email:    ${EMAIL}`);
  console.log(`Password: ${PASSWORD}`);
  console.log("---");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
