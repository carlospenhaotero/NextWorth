import { describe, it, expect } from "vitest";
import {
  returnOverMonths,
  periodicReturns,
  inferPeriodsPerYear,
  annualizedVolatility,
  momentumBand,
  volatilityBand,
  riskClassFor,
  fitVerdict,
  type SignalPoint,
} from "@/server/asset-signal";

const DAY = 86_400_000;

/** Build a monthly series ending "today" (epoch 0-based, in ms) from closes. */
function monthlySeries(closes: number[], stepDays = 30): SignalPoint[] {
  const end = closes.length * stepDays * DAY;
  return closes.map((close, i) => ({
    time: end - (closes.length - 1 - i) * stepDays * DAY,
    close,
  }));
}

describe("returnOverMonths", () => {
  it("returns null with fewer than two points", () => {
    expect(returnOverMonths([{ time: DAY, close: 10 }], 3)).toBeNull();
  });

  it("computes the cumulative return over the window by date", () => {
    // 13 monthly points: 100 twelve months ago, 150 now => +50% over 12m.
    const pts = monthlySeries([100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150].map((v) => v || 120));
    // Override the first and last so the 12m lookup is exact.
    pts[0].close = 100;
    pts[pts.length - 1].close = 150;
    const r = returnOverMonths(pts, 12);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(50, 1);
  });

  it("returns null when the series does not reach that far back", () => {
    // Only ~3 months of data, asking for 12 months.
    const pts = monthlySeries([100, 110, 120, 130]);
    expect(returnOverMonths(pts, 12)).toBeNull();
  });

  it("picks the closest point to the target date, not the index", () => {
    // Daily-spaced series (the real owned-asset gotcha): 6 months back must be
    // located by date, giving a large window, not 6 days.
    const closes: number[] = [];
    for (let i = 0; i < 250; i++) closes.push(100 + i); // rising daily
    const pts = monthlySeries(closes, 1); // 1-day spacing
    const r6 = returnOverMonths(pts, 6);
    const r1day = ((pts[pts.length - 1].close / pts[pts.length - 2].close) - 1) * 100;
    // 6-month return must be far larger than a single-day return.
    expect(r6!).toBeGreaterThan(r1day * 10);
  });

  it("returns null if the past close is not positive", () => {
    const pts = monthlySeries([0, 110, 120, 130, 140, 150, 160]);
    pts[0].close = 0;
    // 6 months back lands on the zero -> null.
    expect(returnOverMonths(pts, 6)).toBeNull();
  });
});

describe("periodicReturns", () => {
  it("computes fractional period-over-period returns", () => {
    expect(periodicReturns([100, 110, 121])).toEqual([
      expect.closeTo(0.1, 5),
      expect.closeTo(0.1, 5),
    ]);
  });

  it("skips periods where the previous close is not positive", () => {
    expect(periodicReturns([0, 100, 110])).toEqual([expect.closeTo(0.1, 5)]);
  });

  it("returns empty for a single point", () => {
    expect(periodicReturns([100])).toEqual([]);
  });
});

describe("inferPeriodsPerYear", () => {
  it("infers ~252 for daily spacing", () => {
    const pts = monthlySeries([1, 2, 3, 4, 5], 1);
    expect(inferPeriodsPerYear(pts)).toBeCloseTo(365.25, 0);
  });

  it("infers ~12 for monthly spacing", () => {
    const pts = monthlySeries([1, 2, 3, 4, 5], 30);
    expect(inferPeriodsPerYear(pts)).toBeCloseTo(12.175, 1);
  });

  it("defaults to 252 with insufficient points", () => {
    expect(inferPeriodsPerYear([{ time: 0, close: 1 }])).toBe(252);
  });
});

describe("annualizedVolatility", () => {
  it("is zero for a flat series", () => {
    const pts = monthlySeries([100, 100, 100, 100, 100]);
    expect(annualizedVolatility(pts)).toBe(0);
  });

  it("scales by the inferred periods-per-year (monthly uses ~sqrt(12))", () => {
    // Alternating +10%/-10%-ish monthly returns.
    const pts = monthlySeries([100, 110, 100, 110, 100, 110, 100], 30);
    const vol = annualizedVolatility(pts);
    expect(vol).toBeGreaterThan(0);
    // Sanity: monthly annualization keeps it in a plausible double-digit range,
    // not the ~250x blow-up a daily factor would produce.
    expect(vol).toBeLessThan(400);
  });

  it("annualizes the same monthly shape higher with a daily factor", () => {
    const monthly = annualizedVolatility(monthlySeries([100, 110, 100, 110, 100], 30));
    const daily = annualizedVolatility(monthlySeries([100, 110, 100, 110, 100], 1));
    expect(daily).toBeGreaterThan(monthly);
  });
});

describe("momentumBand", () => {
  it.each([
    [null, "flat"],
    [0, "flat"],
    [4.9, "flat"],
    [5, "up"],
    [19.9, "up"],
    [20, "strongUp"],
    [-5, "down"],
    [-20, "strongDown"],
  ] as const)("maps %s -> %s", (input, expected) => {
    expect(momentumBand(input)).toBe(expected);
  });
});

describe("volatilityBand", () => {
  it.each([
    [0, "low"],
    [14.9, "low"],
    [15, "medium"],
    [34.9, "medium"],
    [35, "high"],
    [80, "high"],
  ] as const)("maps %s -> %s", (input, expected) => {
    expect(volatilityBand(input)).toBe(expected);
  });
});

describe("riskClassFor", () => {
  it("classifies by the shared RISK_WEIGHTS", () => {
    expect(riskClassFor("cash")).toEqual({ class: "low", weight: 0 });
    expect(riskClassFor("bond")).toEqual({ class: "low", weight: 0.2 });
    expect(riskClassFor("commodity")).toEqual({ class: "medium", weight: 0.5 });
    expect(riskClassFor("stock")).toEqual({ class: "high", weight: 0.75 });
    expect(riskClassFor("crypto")).toEqual({ class: "high", weight: 1 });
  });

  it("falls back to medium (0.5) for an unknown type", () => {
    expect(riskClassFor("mystery")).toEqual({ class: "medium", weight: 0.5 });
  });
});

describe("fitVerdict", () => {
  it("aligns a high-risk asset with a growth/aggressive portfolio", () => {
    expect(fitVerdict("high", "growth")).toBe("aligned");
    expect(fitVerdict("high", "aggressive")).toBe("aligned");
  });

  it("flags a high-risk asset as above a conservative portfolio", () => {
    expect(fitVerdict("high", "conservative")).toBe("above");
    expect(fitVerdict("high", "moderate")).toBe("above");
  });

  it("flags a low-risk asset as below a growth portfolio", () => {
    expect(fitVerdict("low", "growth")).toBe("below");
  });

  it("treats balanced as the medium class", () => {
    expect(fitVerdict("medium", "balanced")).toBe("aligned");
    expect(fitVerdict("low", "balanced")).toBe("below");
    expect(fitVerdict("high", "balanced")).toBe("above");
  });
});
