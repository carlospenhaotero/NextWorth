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
  avgBuyPrice: number | null;
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
  // Derived metrics (in base currency where monetary)
  projectedAnnualIncome: number | null; // savings: balance * TAE
  projectedValue1y: number | null; // savings: balance * (1 + TAE)
  annualCouponIncome: number | null; // bond: quantity * faceValue * couponRate
  currentYield: number | null; // bond: annual coupon / current value, %
  redemptionValue: number | null; // bond: quantity * faceValue at maturity
  daysToMaturity: number | null; // bond
  annualDividendIncome: number | null; // stock/etf: quantity * dividendRate
  dividendYield: number | null; // stock/etf: trailing dividend yield, %
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

/** Lightweight list of the user's holdings (no market data) for duplicate detection. */
export async function getExistingPositionsLite(
  userId: string
): Promise<{ id: number; symbol: string; assetType: string }[]> {
  const rows = await prisma.userPortfolio.findMany({
    where: { userId },
    select: { id: true, asset: { select: { symbol: true, assetType: true } } },
  });
  return rows.map((r) => ({ id: r.id, symbol: r.asset.symbol, assetType: r.asset.assetType }));
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
    const quantity = Number(row.quantity);
    const avgBuyPrice = row.avgBuyPrice != null ? Number(row.avgBuyPrice) : null;
    const faceValue = row.faceValue != null ? Number(row.faceValue) : null;
    const couponRate = row.couponRate != null ? Number(row.couponRate) : null;
    const tae = row.tae != null ? Number(row.tae) : null;

    let currentPriceNative: number | null = null;
    let errorMsg: string | null = null;
    let priceEstimated = false;
    let quote: Awaited<ReturnType<typeof getQuote>> | null = null;

    try {
      if (["cash", "savings"].includes(row.asset.assetType)) {
        currentPriceNative = 1;
      } else {
        quote = await getQuote(row.asset.symbol);
        currentPriceNative = quote.currentPrice ?? null;
      }
    } catch {
      // No live price: fall back to cost, then to par (bonds), if known.
      currentPriceNative = avgBuyPrice ?? faceValue ?? null;
      priceEstimated = currentPriceNative != null;
      errorMsg = "Price unavailable, using cost";
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

    // Invested is only known when a cost basis was provided.
    const investedNative = avgBuyPrice != null ? quantity * avgBuyPrice : null;

    let investedBase: number | null = null;
    let currentPriceBase: number | null = null;
    let currentValueBase: number | null = null;
    let profitLoss: number | null = null;
    let profitLossPct: number | null = null;

    if (fxRate !== null && investedNative !== null) {
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

    // Derived metrics for savings (TAE) and bonds (coupon/maturity).
    let projectedAnnualIncome: number | null = null;
    let projectedValue1y: number | null = null;
    let annualCouponIncome: number | null = null;
    let currentYield: number | null = null;
    let redemptionValue: number | null = null;
    let daysToMaturity: number | null = null;
    let annualDividendIncome: number | null = null;
    let dividendYield: number | null = null;

    if (
      (row.asset.assetType === "stock" || row.asset.assetType === "etf") &&
      quote?.dividendRate != null &&
      fxRate != null
    ) {
      annualDividendIncome = quantity * quote.dividendRate * fxRate;
      dividendYield = quote.dividendYield != null ? quote.dividendYield * 100 : null;
    }

    if (row.asset.assetType === "savings" && tae != null && fxRate != null) {
      const balanceBase = quantity * fxRate; // unit price is 1
      projectedAnnualIncome = balanceBase * (tae / 100);
      projectedValue1y = balanceBase * (1 + tae / 100);
    }

    if (row.asset.assetType === "bond") {
      if (faceValue != null && couponRate != null && fxRate != null) {
        annualCouponIncome = quantity * faceValue * (couponRate / 100) * fxRate;
        if (currentValueBase != null && currentValueBase > 0) {
          currentYield = (annualCouponIncome / currentValueBase) * 100;
        }
      }
      if (faceValue != null && fxRate != null) {
        redemptionValue = quantity * faceValue * fxRate;
      }
      if (row.maturityDate) {
        const diffMs = row.maturityDate.getTime() - Date.now();
        daysToMaturity = Math.max(0, Math.ceil(diffMs / 86_400_000));
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
      tae,
      faceValue,
      couponRate,
      couponFrequency: row.couponFrequency,
      maturityDate: row.maturityDate,
      currentPrice: currentPriceBase,
      invested: investedBase,
      currentValue: currentValueBase,
      profitLoss,
      profitLossPct,
      projectedAnnualIncome,
      projectedValue1y,
      annualCouponIncome,
      currentYield,
      redemptionValue,
      daysToMaturity,
      annualDividendIncome,
      dividendYield,
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
