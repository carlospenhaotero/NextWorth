import "server-only";
import { prisma } from "@/server/db";
import { getPortfolioForUser } from "@/queries/portfolio";
import { getAssetPrediction } from "@/server/prediction";

export type ProjectionHorizon = "3m" | "6m" | "1y" | "2y" | "5y";

export interface PortfolioProjectionPoint {
  /** ISO date (yyyy-mm-dd), one per future month. */
  date: string;
  /** Projected portfolio value in base currency at this date. */
  value: number;
}

export interface PortfolioProjectionData {
  baseCurrency: string;
  horizon: ProjectionHorizon;
  series: PortfolioProjectionPoint[];
  /** Current total portfolio value, in base currency (anchor for the chart). */
  startValue: number;
}

const HORIZON_MONTHS: Record<ProjectionHorizon, number> = {
  "3m": 3,
  "6m": 6,
  "1y": 12,
  "2y": 24,
  "5y": 60,
};

const MARKET_ASSET_TYPES = ["stock", "etf", "fund", "crypto", "commodity"];

// Same cadence as /api/predictions.
const PREDICTION_TTL = 7200;

function addMonthsUTC(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Flat (no-growth) projection: the position keeps its current value every month. */
function flatSeries(value: number, months: number): number[] {
  return new Array(months).fill(value);
}

/**
 * Projects the portfolio's total value forward, month by month, by scaling
 * each position's current value (from getPortfolioForUser) with a
 * type-specific growth model:
 * - Market assets (stock/etf/fund/crypto/commodity): the Chronos forecast
 *   already used on the asset detail page, applied as a relative factor
 *   (predicted_close[i] / predicted_close[0]) on top of the current value.
 *   Falls back to a flat line for that position if Chronos is unavailable.
 * - Savings: compounded monthly at the position's TAE.
 * - Bonds: current value plus prorated coupon income (annualCouponIncome).
 * - Cash (and anything else): flat.
 *
 * A single symbol's forecast failing never breaks the aggregate: it just
 * degrades to a flat contribution for that position.
 */
export async function getPortfolioProjection(
  userId: string,
  horizon: ProjectionHorizon
): Promise<PortfolioProjectionData> {
  const months = HORIZON_MONTHS[horizon];
  const portfolio = await getPortfolioForUser(userId);

  if (portfolio.positions.length === 0) {
    return { baseCurrency: portfolio.baseCurrency, horizon, series: [], startValue: 0 };
  }

  // getPortfolioForUser doesn't expose Asset.id (needed by Chronos caching),
  // so resolve UserPortfolio.id -> Asset.id with one lightweight query.
  const idRows = await prisma.userPortfolio.findMany({
    where: { userId },
    select: { id: true, assetId: true },
  });
  const assetIdByPositionId = new Map(idRows.map((r) => [r.id, r.assetId]));

  const today = new Date();
  const axis = Array.from({ length: months }, (_, i) => toDateStr(addMonthsUTC(today, i + 1)));

  const contributions = await Promise.all(
    portfolio.positions.map(async (pos): Promise<number[]> => {
      const currentValue = pos.currentValue ?? 0;
      if (currentValue <= 0) return flatSeries(0, months);

      if (MARKET_ASSET_TYPES.includes(pos.assetType)) {
        const assetId = assetIdByPositionId.get(pos.id);
        if (assetId == null) return flatSeries(currentValue, months);
        try {
          const prediction = await getAssetPrediction(assetId, pos.symbol, horizon, PREDICTION_TTL);
          const points = prediction?.predictions ?? [];
          const base = points[0]?.predicted_close;
          if (points.length === 0 || !base) return flatSeries(currentValue, months);
          return Array.from({ length: months }, (_, i) => {
            const p = points[Math.min(i, points.length - 1)];
            const factor = p.predicted_close / base;
            return currentValue * factor;
          });
        } catch {
          // A single symbol's forecast failing must never break the aggregate.
          return flatSeries(currentValue, months);
        }
      }

      if (pos.assetType === "savings") {
        const rate = pos.tae != null ? pos.tae / 100 : 0;
        return Array.from({ length: months }, (_, i) =>
          currentValue * Math.pow(1 + rate, (i + 1) / 12)
        );
      }

      if (pos.assetType === "bond") {
        const annualCoupon = pos.annualCouponIncome ?? 0;
        return Array.from(
          { length: months },
          (_, i) => currentValue + annualCoupon * ((i + 1) / 12)
        );
      }

      // Cash and any other type: flat.
      return flatSeries(currentValue, months);
    })
  );

  const series: PortfolioProjectionPoint[] = axis.map((date, i) => ({
    date,
    value: contributions.reduce((sum, c) => sum + c[i], 0),
  }));

  return {
    baseCurrency: portfolio.baseCurrency,
    horizon,
    series,
    startValue: portfolio.totalCurrentValue,
  };
}
