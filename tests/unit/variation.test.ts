import { describe, it, expect } from "vitest";
import { computeVariations } from "@/lib/variation";

/** Builds a daily series ending today, oldest first. */
function series(closes: number[]): { date: string; close: number }[] {
  const DAY = 86_400_000;
  const end = Date.UTC(2026, 6, 21); // fixed reference date
  return closes.map((close, i) => ({
    date: new Date(end - (closes.length - 1 - i) * DAY).toISOString().split("T")[0],
    close,
  }));
}

describe("computeVariations", () => {
  it("returns nulls for an empty series", () => {
    expect(computeVariations([])).toEqual({ price: null, todayPct: null, weekPct: null });
  });

  it("computes today from the last two closes", () => {
    const v = computeVariations(series([100, 110]));
    expect(v.price).toBe(110);
    expect(v.todayPct).toBeCloseTo(10, 5); // (110-100)/100
  });

  it("computes the 7-day move against the close ~7 days earlier", () => {
    // 8 daily points: index 0 is 7 days before the last.
    const v = computeVariations(series([200, 201, 202, 203, 204, 205, 206, 220]));
    expect(v.weekPct).toBeCloseTo(((220 - 200) / 200) * 100, 5); // vs point 7 days ago
    expect(v.todayPct).toBeCloseTo(((220 - 206) / 206) * 100, 5);
  });

  it("leaves weekPct null when the series is shorter than a week", () => {
    const v = computeVariations(series([100, 101, 102]));
    expect(v.weekPct).toBeNull();
    expect(v.todayPct).toBeCloseTo(((102 - 101) / 101) * 100, 5);
  });

  it("ignores non-positive/invalid closes and sorts by date", () => {
    const s = series([100, 110]).reverse(); // out of order
    s.push({ date: "not-a-date", close: 5 });
    s.push({ date: "2026-07-20", close: 0 }); // dropped
    const v = computeVariations(s);
    expect(v.price).toBe(110);
    expect(v.todayPct).toBeCloseTo(10, 5);
  });

  it("reports negative moves", () => {
    const v = computeVariations(series([100, 90]));
    expect(v.todayPct).toBeCloseTo(-10, 5);
  });
});
