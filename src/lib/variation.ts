export interface AssetVariation {
  /** Latest close in the series, or null when unavailable. */
  price: number | null;
  /** Last-session move as a percentage, or null when not derivable. */
  todayPct: number | null;
  /** ~7-day move as a percentage, or null when not derivable. */
  weekPct: number | null;
}

const DAY_MS = 86_400_000;

/**
 * Derives today's and 7-day price variation from a short daily-close series.
 * The series can arrive in any order and may contain gaps (weekends/holidays):
 * - today = last close vs the previous close.
 * - week  = last close vs the latest close at or before 7 calendar days ago.
 * Returns nulls for whatever can't be computed from the available points.
 */
export function computeVariations(
  series: { date: string; close: number }[]
): AssetVariation {
  const points = series
    .filter((p) => Number.isFinite(p.close) && p.close > 0)
    .map((p) => ({ ms: new Date(p.date).getTime(), close: p.close }))
    .filter((p) => Number.isFinite(p.ms))
    .sort((a, b) => a.ms - b.ms);

  if (points.length === 0) {
    return { price: null, todayPct: null, weekPct: null };
  }

  const last = points[points.length - 1];
  const price = last.close;

  let todayPct: number | null = null;
  if (points.length >= 2) {
    const prev = points[points.length - 2];
    if (prev.close !== 0) todayPct = ((last.close - prev.close) / prev.close) * 100;
  }

  let weekPct: number | null = null;
  const weekAgoMs = last.ms - 7 * DAY_MS;
  let ref: { ms: number; close: number } | null = null;
  for (const p of points) {
    if (p.ms <= weekAgoMs) ref = p;
    else break;
  }
  if (ref && ref.close !== 0) {
    weekPct = ((last.close - ref.close) / ref.close) * 100;
  }

  return { price, todayPct, weekPct };
}
