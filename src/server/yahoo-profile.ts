// NOTE: no "server-only" here on purpose. This pure profile-fetching logic is
// reused both by the server (src/server/asset-profile.ts) and by the standalone
// backfill script (prisma/backfill-asset-profiles.ts), which cannot import
// server-only modules.
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export interface YahooProfile {
  sector: string | null;
  industry: string | null;
  country: string | null;
  sectorWeightings: Record<string, number> | null; // ETF only
  status: "ok" | "unavailable" | "unsupported";
}

// Asset types that have no sector/country concept; never queried against Yahoo.
export const UNSUPPORTED_PROFILE_TYPES = new Set([
  "crypto",
  "commodity",
  "currency",
  "cash",
  "savings",
  "bond",
  // Mutual funds resolve to Morningstar symbols (0P..F) that don't expose a
  // reliable sector breakdown via quoteSummary; skip enrichment.
  "fund",
]);

/**
 * Flattens Yahoo's `topHoldings.sectorWeightings`, which comes as an array of
 * single-key objects ([{ technology: 0.39 }, { financial_services: 0.11 }, ...]),
 * into one record. Returns null if nothing usable is found.
 */
function flattenSectorWeightings(raw: unknown): Record<string, number> | null {
  if (!Array.isArray(raw)) return null;
  const out: Record<string, number> = {};
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    for (const [key, value] of Object.entries(entry as Record<string, unknown>)) {
      if (typeof value === "number" && value > 0) out[key] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Best-effort enrichment of an asset's static profile from Yahoo quoteSummary.
 * Equities yield sector/industry/country; ETFs yield a sector breakdown.
 * Never throws: on failure or unsupported type it reports a status instead.
 */
export async function getYahooProfile(
  symbol: string,
  assetType: string
): Promise<YahooProfile> {
  const empty: Omit<YahooProfile, "status"> = {
    sector: null,
    industry: null,
    country: null,
    sectorWeightings: null,
  };

  if (UNSUPPORTED_PROFILE_TYPES.has(assetType)) {
    return { ...empty, status: "unsupported" };
  }

  const yahooSymbol = symbol.toUpperCase();

  try {
    if (assetType === "etf") {
      const summary = (await yahooFinance.quoteSummary(
        yahooSymbol,
        { modules: ["topHoldings"] },
        { validateResult: false }
      )) as Record<string, unknown>;
      const weightings = flattenSectorWeightings(
        (summary.topHoldings as Record<string, unknown> | undefined)?.sectorWeightings
      );
      return {
        ...empty,
        sectorWeightings: weightings,
        status: weightings ? "ok" : "unavailable",
      };
    }

    // stock / equity
    const summary = (await yahooFinance.quoteSummary(
      yahooSymbol,
      { modules: ["assetProfile"] },
      { validateResult: false }
    )) as Record<string, unknown>;
    const profile = summary.assetProfile as Record<string, unknown> | undefined;
    const sector = typeof profile?.sector === "string" ? profile.sector : null;
    const industry = typeof profile?.industry === "string" ? profile.industry : null;
    const country = typeof profile?.country === "string" ? profile.country : null;
    return {
      sector,
      industry,
      country,
      sectorWeightings: null,
      status: sector || country ? "ok" : "unavailable",
    };
  } catch {
    return { ...empty, status: "unavailable" };
  }
}
