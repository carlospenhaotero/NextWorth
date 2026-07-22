import { getAllAssets, type CatalogAsset } from "@/lib/assets-catalog";
import type { AdvisorMetrics } from "@/server/advisor/metrics";
import type { Locale } from "@/i18n/config";

export interface AssetSuggestion {
  symbol: string;
  name: string;
  displaySymbol?: string;
  assetType: string;
  exchange?: string;
  currency: string;
}

export interface AssetSuggestionsResult {
  /** Catalog assets suggested to diversify, never symbols the user already owns. */
  picks: AssetSuggestion[];
  /** Asset-type classes being filled (drives the explanation). */
  gapTypes: string[];
  /** Short educational prose. No disclaimer (the UI adds a fixed one). */
  explanation: string;
  /** Whether the prose came from Gemini or the deterministic fallback. */
  source: "ai" | "fallback";
}

// Fill diversification gaps favoring broad instruments first.
const FILL_PRIORITY = ["etf", "bond", "commodity", "stock", "crypto"];
// A class below this share of the portfolio counts as thin/absent.
const THIN_PCT = 10;
const MAX_PICKS = 4;

// Localized labels for the asset classes (used by the deterministic fallback).
export const TYPE_LABELS: Record<Locale, Record<string, string>> = {
  es: {
    etf: "ETFs indexados",
    bond: "renta fija",
    commodity: "materias primas",
    stock: "acciones",
    crypto: "cripto",
  },
  en: {
    etf: "index ETFs",
    bond: "fixed income",
    commodity: "commodities",
    stock: "stocks",
    crypto: "crypto",
  },
};

function toSuggestion(a: CatalogAsset & { assetType: string }): AssetSuggestion {
  return {
    symbol: a.symbol,
    name: a.name,
    displaySymbol: a.displaySymbol,
    assetType: a.assetType,
    exchange: a.exchange,
    currency: a.currency,
  };
}

function pctByType(metrics: AdvisorMetrics): Record<string, number> {
  const out: Record<string, number> = {};
  for (const slice of metrics.byAssetType) out[slice.key] = slice.pct;
  return out;
}

/**
 * Deterministic candidate selection: picks up to MAX_PICKS catalog assets that
 * fill the portfolio's thinnest/absent asset classes, spreading one per class
 * before doubling up, and never suggesting something already owned. Pure and
 * unit-tested; the AI layer only explains the result.
 */
export function selectSuggestionCandidates(
  metrics: AdvisorMetrics,
  ownedSymbols: Set<string>
): { picks: AssetSuggestion[]; gapTypes: string[] } {
  const pct = pctByType(metrics);
  const hasPortfolio = metrics.totalValue > 0 && metrics.byAssetType.length > 0;

  let gapTypes: string[] = hasPortfolio
    ? FILL_PRIORITY.filter((t) => (pct[t] ?? 0) < THIN_PCT)
    : ["etf", "bond", "commodity"]; // Empty portfolio: a diversified starter core.

  const catalog = getAllAssets();
  const byType = new Map<string, AssetSuggestion[]>();
  for (const type of gapTypes) {
    byType.set(
      type,
      catalog
        .filter((a) => a.assetType === type && !ownedSymbols.has(a.symbol))
        .map(toSuggestion)
    );
  }

  const picks: AssetSuggestion[] = [];
  for (let round = 0; picks.length < MAX_PICKS; round++) {
    const before = picks.length;
    for (const type of gapTypes) {
      if (picks.length >= MAX_PICKS) break;
      const list = byType.get(type);
      if (list && list.length > round) picks.push(list[round]);
    }
    if (picks.length === before) break; // No more candidates to draw from.
  }

  // Already diversified (or everything owned): fall back to broad ETFs not held.
  if (picks.length === 0) {
    const etfs = catalog
      .filter((a) => a.assetType === "etf" && !ownedSymbols.has(a.symbol))
      .slice(0, 3)
      .map(toSuggestion);
    picks.push(...etfs);
    gapTypes = etfs.length > 0 ? ["etf"] : [];
  }

  return { picks, gapTypes };
}
