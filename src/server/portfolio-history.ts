import "server-only";
import { prisma } from "@/server/db";
import { getAssetHistory, getFxRate } from "@/server/market-data";

export interface PortfolioHistoryPoint {
  /** ISO date (yyyy-mm-dd). */
  date: string;
  /** Portfolio market value in base currency at this date. */
  value: number;
  /** Cost basis (sum of invested) of positions held by this date, in base currency. */
  invested: number;
}

export interface PortfolioMover {
  id: number;
  symbol: string;
  name: string;
  assetType: string;
  /** Current value in base currency. */
  value: number;
  /** P/L over the selected range, in base currency. */
  pnl: number;
  /** P/L over the selected range, as a percentage. */
  pnlPct: number;
}

export interface PortfolioHistoryData {
  baseCurrency: string;
  range: string;
  series: PortfolioHistoryPoint[];
  currentValue: number;
  totalInvested: number;
  profitLoss: number;
  profitLossPct: number;
  /** Per-position performance over the selected range, biggest movers first. */
  movers: PortfolioMover[];
  /** ISO date of the first point, or null when the user has no positions. */
  startDate: string | null;
}

export type PortfolioRange = "1w" | "1m" | "3m" | "6m" | "1y" | "all";

const MARKET_ASSET_TYPES = ["stock", "etf", "fund", "crypto", "commodity"];

const DAY_MS = 86_400_000;
const YEAR_MS = 365.25 * DAY_MS;

/** Days covered by each preset range. "all" is resolved from the oldest position. */
const RANGE_DAYS: Record<Exclude<PortfolioRange, "all">, number> = {
  "1w": 7,
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
};

const MAX_POINTS = 180;

function dayStartUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

/**
 * Reconstructs the user's net-worth evolution from each position's createdAt.
 * Positions contribute nothing before they were added; from then on, market
 * assets follow their historical close, savings accrue their TAE, and cash/bonds
 * stay flat at cost. FX is applied at the current rate across the whole series.
 */
export async function getPortfolioHistory(
  userId: string,
  range: PortfolioRange = "all"
): Promise<PortfolioHistoryData> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { baseCurrency: true },
  });
  const baseCurrency = user?.baseCurrency?.toUpperCase() || "USD";

  const rows = await prisma.userPortfolio.findMany({
    where: { userId },
    include: { asset: true },
  });

  if (rows.length === 0) {
    return {
      baseCurrency,
      range,
      series: [],
      currentValue: 0,
      totalInvested: 0,
      profitLoss: 0,
      profitLossPct: 0,
      movers: [],
      startDate: null,
    };
  }

  const today = dayStartUTC(new Date());
  const earliest = rows.reduce(
    (min, r) => (r.createdAt < min ? r.createdAt : min),
    rows[0].createdAt
  );
  const earliestDay = dayStartUTC(earliest);

  let startDate: Date;
  if (range === "all") {
    startDate = earliestDay;
  } else {
    const rangeStart = new Date(today.getTime() - RANGE_DAYS[range] * DAY_MS);
    startDate = rangeStart > earliestDay ? rangeStart : earliestDay;
  }

  const spanDays = Math.max(1, Math.round((today.getTime() - startDate.getTime()) / DAY_MS));

  // Pick fetch granularity + axis step so the point count stays bounded and the
  // data volume per asset stays reasonable for long spans.
  let interval: "1d" | "1wk" | "1mo";
  let stepDays: number;
  if (spanDays <= 120) {
    interval = "1d";
    stepDays = 1;
  } else if (spanDays <= 540) {
    interval = "1d";
    stepDays = 3;
  } else if (spanDays <= 1100) {
    interval = "1wk";
    stepDays = 7;
  } else {
    interval = "1mo";
    stepDays = 30;
  }

  const monthsNeeded = Math.min(120, Math.max(1, Math.ceil(spanDays / 30) + 1));

  // Build the date axis.
  const axis: Date[] = [];
  for (let t = startDate.getTime(); t <= today.getTime(); t += stepDays * DAY_MS) {
    axis.push(new Date(t));
  }
  if (axis.length === 0 || axis[axis.length - 1].getTime() !== today.getTime()) {
    axis.push(today);
  }

  // FX rate cache (current rates).
  const fxCache: Record<string, number> = {};
  async function fxRate(from: string): Promise<number> {
    const f = from.toUpperCase();
    if (f === baseCurrency) return 1;
    if (fxCache[f] != null) return fxCache[f];
    try {
      const rate = await getFxRate(f, baseCurrency);
      fxCache[f] = rate;
      return rate;
    } catch {
      fxCache[f] = 1; // Best-effort fallback; avoids dropping the position.
      return 1;
    }
  }

  // Per-position contribution to value/invested for each axis date.
  const contributions = await Promise.all(
    rows.map(async (row) => {
      const type = row.asset.assetType;
      const quantity = Number(row.quantity);
      const avgBuyPrice = row.avgBuyPrice != null ? Number(row.avgBuyPrice) : null;
      const faceValue = row.faceValue != null ? Number(row.faceValue) : null;
      const tae = row.tae != null ? Number(row.tae) : null;
      const fx = await fxRate(row.asset.currency);
      const createdMs = dayStartUTC(row.createdAt).getTime();

      // Cost basis in base currency. Unit price is 1 for cash/savings.
      const unitCost = avgBuyPrice ?? faceValue ?? 1;
      const investedBase = quantity * unitCost * fx;

      // Closing-price lookup for market assets, with forward-fill.
      let closeAt: (ms: number) => number = () => unitCost;
      if (MARKET_ASSET_TYPES.includes(type)) {
        try {
          const history = await getAssetHistory(row.asset.symbol, monthsNeeded, interval, 3600);
          const points = history.series
            .map((p) => ({ ms: dayStartUTC(new Date(p.date)).getTime(), close: p.close }))
            .filter((p) => Number.isFinite(p.close) && p.close > 0)
            .sort((a, b) => a.ms - b.ms);
          if (points.length > 0) {
            const fallback = avgBuyPrice ?? points[0].close;
            closeAt = (ms: number) => {
              let val = fallback;
              for (const p of points) {
                if (p.ms <= ms) val = p.close;
                else break;
              }
              return val;
            };
          }
        } catch {
          // Keep the cost-based fallback if history is unavailable.
        }
      }

      const value = axis.map((d) => {
        const ms = d.getTime();
        if (ms < createdMs) return 0;
        if (ms === createdMs) return investedBase; // Anchor entry to actual cost.

        if (type === "cash" || type === "bond") {
          return investedBase; // Flat at cost.
        }
        if (type === "savings") {
          const years = (ms - createdMs) / YEAR_MS;
          const principal = quantity * fx;
          const rate = tae != null ? tae / 100 : 0;
          return principal * Math.pow(1 + rate, years);
        }
        return quantity * closeAt(ms) * fx; // Market asset.
      });

      const invested = axis.map((d) => (d.getTime() >= createdMs ? investedBase : 0));

      return {
        meta: {
          id: row.id,
          symbol: row.asset.symbol,
          name: row.asset.name,
          assetType: row.asset.assetType,
        },
        value,
        invested,
      };
    })
  );

  // Aggregate across positions.
  let series: PortfolioHistoryPoint[] = axis.map((d, i) => {
    let value = 0;
    let invested = 0;
    for (const c of contributions) {
      value += c.value[i];
      invested += c.invested[i];
    }
    return { date: toDateStr(d), value, invested };
  });

  // Downsample for render while keeping the last point.
  if (series.length > MAX_POINTS) {
    const step = Math.ceil(series.length / MAX_POINTS);
    const sampled = series.filter((_, i) => i % step === 0);
    if (sampled[sampled.length - 1] !== series[series.length - 1]) {
      sampled.push(series[series.length - 1]);
    }
    series = sampled;
  }

  // Period performance: compare the window's start value with the current one,
  // netting out any deposits made inside the window so new money is not counted
  // as a gain. For "all" this reduces to (currentValue - totalInvested).
  const first = series[0];
  const last = series[series.length - 1];
  const currentValue = last?.value ?? 0;
  const totalInvested = last?.invested ?? 0;
  const startValue = first?.value ?? 0;
  const startInvested = first?.invested ?? 0;
  const depositsInWindow = totalInvested - startInvested;
  const profitLoss = currentValue - startValue - depositsInWindow;
  const capitalBase = startValue + depositsInWindow;
  const profitLossPct = capitalBase > 0 ? (profitLoss / capitalBase) * 100 : 0;

  // Per-position performance over the same window (uses the full, non-downsampled
  // arrays so the start/end values are exact).
  const lastIdx = axis.length - 1;
  const movers: PortfolioMover[] = contributions
    .map((c) => {
      const v0 = c.value[0];
      const vN = c.value[lastIdx];
      const deposits = c.invested[lastIdx] - c.invested[0];
      const pnl = vN - v0 - deposits;
      const base = v0 + deposits;
      return {
        id: c.meta.id,
        symbol: c.meta.symbol,
        name: c.meta.name,
        assetType: c.meta.assetType,
        value: vN,
        pnl,
        pnlPct: base > 0 ? (pnl / base) * 100 : 0,
      };
    })
    .filter((m) => m.value > 0)
    .sort((a, b) => Math.abs(b.pnlPct) - Math.abs(a.pnlPct))
    .slice(0, 6);

  return {
    baseCurrency,
    range,
    series,
    currentValue,
    totalInvested,
    profitLoss,
    profitLossPct,
    movers,
    startDate: series[0]?.date ?? null,
  };
}

export interface PortfolioKpis {
  baseCurrency: string;
  /** Total cost basis, in base currency. */
  invested: number;
  /** Current market value, in base currency. */
  currentValue: number;
  /** Last-day move, deposits netted out, in base currency. */
  todayChange: number;
  todayChangePct: number;
  /** Last-30-days move, deposits netted out, in base currency. */
  change30d: number;
  change30dPct: number;
}

/**
 * Fixed KPIs for the overview header. Derived from the 1-month daily
 * reconstruction so it reuses the exact same net-worth logic as the chart:
 * - invested / currentValue / 30d move come straight from that window.
 * - today's move is the delta between the last two daily points, netting out
 *   any deposit made that day (same convention as profitLoss and the movers).
 *
 * The 1m window stays under MAX_POINTS, so its series is never downsampled and
 * the last-two-points delta is exact.
 */
export async function getPortfolioKpis(userId: string): Promise<PortfolioKpis> {
  const h = await getPortfolioHistory(userId, "1m");
  const { series } = h;
  const last = series[series.length - 1];
  const prev = series[series.length - 2];

  let todayChange = 0;
  let todayChangePct = 0;
  if (last && prev) {
    const deposits = last.invested - prev.invested;
    todayChange = last.value - prev.value - deposits;
    const base = prev.value + deposits;
    todayChangePct = base > 0 ? (todayChange / base) * 100 : 0;
  }

  return {
    baseCurrency: h.baseCurrency,
    invested: h.totalInvested,
    currentValue: h.currentValue,
    todayChange,
    todayChangePct,
    change30d: h.profitLoss,
    change30dPct: h.profitLossPct,
  };
}
