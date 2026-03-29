import "server-only";
import { prisma } from "@/server/db";
import { getQuote, getFxRate } from "@/server/market-data";

interface Position {
  id: number;
  symbol: string;
  name: string;
  assetType: string;
  assetCurrency: string;
  baseCurrency: string;
  quantity: number;
  avgBuyPrice: number;
  tae: number | null;
  faceValue: number | null;
  couponRate: number | null;
  couponFrequency: number | null;
  maturityDate: Date | null;
  currentPrice: number | null;
  invested: number | null;
  currentValue: number | null;
  profitLoss: number | null;
  profitLossPct: number | null;
  error: string | null;
  priceEstimated: boolean;
}

export interface PortfolioData {
  baseCurrency: string;
  totalCurrentValue: number;
  totalInvested: number;
  totalProfitLoss: number;
  positions: Position[];
}

export async function getPortfolioForUser(
  userId: string
): Promise<PortfolioData> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { baseCurrency: true },
  });

  const baseCurrency = user?.baseCurrency?.toUpperCase() || "USD";

  const rows = await prisma.userPortfolio.findMany({
    where: { userId },
    include: { asset: true },
    orderBy: { asset: { symbol: "asc" } },
  });

  if (rows.length === 0) {
    return {
      baseCurrency,
      totalCurrentValue: 0,
      totalInvested: 0,
      totalProfitLoss: 0,
      positions: [],
    };
  }

  const fxCache: Record<string, number> = {};
  async function getRateCached(from: string, to: string): Promise<number> {
    if (from === to) return 1;
    const key = `${from}_${to}`;
    if (fxCache[key]) return fxCache[key];
    const rate = await getFxRate(from, to);
    fxCache[key] = rate;
    return rate;
  }

  const positions: Position[] = [];

  for (const row of rows) {
    const assetCurrency = row.asset.currency.toUpperCase();
    let currentPriceNative: number | null = null;
    let errorMsg: string | null = null;
    let priceEstimated = false;

    try {
      if (["cash", "savings"].includes(row.asset.assetType)) {
        currentPriceNative = 1;
      } else {
        const quote = await getQuote(row.asset.symbol);
        currentPriceNative = quote.currentPrice ?? null;
      }
    } catch {
      currentPriceNative = Number(row.avgBuyPrice);
      priceEstimated = true;
      errorMsg = "Price unavailable, using buy price";
    }

    let fxRate: number | null = 1;
    try {
      fxRate = await getRateCached(assetCurrency, baseCurrency);
    } catch {
      if (assetCurrency !== baseCurrency) {
        fxRate = null;
        errorMsg = errorMsg || "FX rate unavailable";
      }
    }

    const quantity = Number(row.quantity);
    const avgBuyPrice = Number(row.avgBuyPrice);
    const investedNative = quantity * avgBuyPrice;

    let investedBase: number | null = null;
    let currentPriceBase: number | null = null;
    let currentValueBase: number | null = null;
    let profitLoss: number | null = null;
    let profitLossPct: number | null = null;

    if (fxRate !== null) {
      investedBase = investedNative * fxRate;
    }

    if (currentPriceNative != null && fxRate != null) {
      currentPriceBase = currentPriceNative * fxRate;
      currentValueBase = quantity * currentPriceNative * fxRate;
      if (investedBase !== null) {
        profitLoss = currentValueBase - investedBase;
        profitLossPct = investedBase !== 0 ? (profitLoss / investedBase) * 100 : 0;
      }
    }

    positions.push({
      id: row.id,
      symbol: row.asset.symbol,
      name: row.asset.name,
      assetType: row.asset.assetType,
      assetCurrency,
      baseCurrency,
      quantity,
      avgBuyPrice,
      tae: row.tae ? Number(row.tae) : null,
      faceValue: row.faceValue ? Number(row.faceValue) : null,
      couponRate: row.couponRate ? Number(row.couponRate) : null,
      couponFrequency: row.couponFrequency,
      maturityDate: row.maturityDate,
      currentPrice: currentPriceBase,
      invested: investedBase,
      currentValue: currentValueBase,
      profitLoss,
      profitLossPct,
      error: errorMsg,
      priceEstimated,
    });
  }

  const totals = positions.reduce(
    (acc, pos) => {
      if (pos.invested != null) acc.totalInvested += pos.invested;
      if (pos.currentValue != null) acc.totalCurrentValue += pos.currentValue;
      if (pos.profitLoss != null) acc.totalProfitLoss += pos.profitLoss;
      return acc;
    },
    { totalCurrentValue: 0, totalInvested: 0, totalProfitLoss: 0 }
  );

  return { baseCurrency, ...totals, positions };
}
