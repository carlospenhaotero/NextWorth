import { PrismaClient } from "../src/generated/prisma/client/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const EMAIL = "carlospenhaotero@gmail.com";

const DAY_MS = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS);
const yearsFromNow = (n: number) => new Date(Date.now() + n * 365 * DAY_MS);

// Asset catalog for the demo. assetType/currency mirror how the app stores them.
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
  { symbol: "BUND10Y", name: "Bono alemán 10A", assetType: "bond", currency: "EUR" },
] as const;

// Positions keyed by symbol. createdAt is staggered so the net-worth line shows
// entries appearing over ~11 months. avgBuyPrice mixes likely gains and losses.
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
  { symbol: "AAPL", quantity: 20, avgBuyPrice: 150, createdAt: daysAgo(330) },
  { symbol: "VOO", quantity: 30, avgBuyPrice: 400, createdAt: daysAgo(300) },
  { symbol: "CASH", quantity: 8000, avgBuyPrice: 1, createdAt: daysAgo(320) },
  { symbol: "SAVINGS", quantity: 12000, avgBuyPrice: 1, tae: 3.25, createdAt: daysAgo(280) },
  { symbol: "BTC-USD", quantity: 0.3, avgBuyPrice: 70000, createdAt: daysAgo(210) },
  { symbol: "GC=F", quantity: 3, avgBuyPrice: 2300, createdAt: daysAgo(180) },
  { symbol: "NVDA", quantity: 50, avgBuyPrice: 110, createdAt: daysAgo(150) },
  { symbol: "MSFT", quantity: 12, avgBuyPrice: 430, createdAt: daysAgo(120) },
  { symbol: "ETH-USD", quantity: 4, avgBuyPrice: 3500, createdAt: daysAgo(90) },
  { symbol: "VWCE.DE", quantity: 40, avgBuyPrice: 110, createdAt: daysAgo(60) },
  {
    symbol: "BUND10Y",
    quantity: 10,
    avgBuyPrice: 950,
    faceValue: 1000,
    couponRate: 2.5,
    couponFrequency: 1,
    maturityDate: yearsFromNow(5),
    createdAt: daysAgo(45),
  },
];

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    throw new Error(
      `Usuario ${EMAIL} no existe. Regístralo primero en /register (BetterAuth guarda la contraseña en Account).`
    );
  }

  // Base currency EUR so el demo se ve en euros y se ejercita la conversión FX.
  await prisma.user.update({
    where: { id: user.id },
    data: { baseCurrency: "EUR" },
  });
  console.log(`Usuario ${user.email} (id: ${user.id}) -> baseCurrency EUR`);

  // Upsert assets and map symbol -> id.
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
  console.log("Seed de Carlos completado.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
