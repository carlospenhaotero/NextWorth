import "server-only";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/server/db";
import { getPortfolioForUser } from "@/queries/portfolio";
import { ensureAssetProfile } from "@/server/asset-profile";

/** Minimal shape of the next-intl translator used to localize labels/insights. */
type Translator = (key: string, values?: Record<string, string | number>) => string;

export interface AllocationSlice {
  key: string;
  label: string;
  value: number; // in base currency
  pct: number; // 0-100, share of classified total
}

export type RiskBand =
  | "conservative"
  | "moderate"
  | "balanced"
  | "growth"
  | "aggressive";

export interface AdvisorInsight {
  id: string;
  severity: "warn" | "info";
  text: string;
}

export interface AdvisorMetrics {
  baseCurrency: string;
  totalValue: number;
  totalInvested: number;
  totalProfitLoss: number;
  profitLossPct: number | null;
  topHolding: { label: string; pct: number } | null;
  byAssetType: AllocationSlice[];
  bySector: AllocationSlice[];
  byCountry: AllocationSlice[];
  riskProfile: {
    score: number; // 0-100
    band: RiskBand;
    equityPct: number;
    defensivePct: number;
    breakdown: { key: string; label: string; value: number; weight: number }[];
  };
  coverage: { profiledPct: number; unknownPct: number };
  insights: AdvisorInsight[];
}

// Relative risk weight per asset class (proxy for volatility, 0..1).
const RISK_WEIGHTS: Record<string, number> = {
  cash: 0,
  savings: 0,
  currency: 0,
  bond: 0.2,
  commodity: 0.5,
  etf: 0.55,
  fund: 0.55,
  stock: 0.75,
  crypto: 1,
};

const EQUITY_TYPES = new Set(["stock", "etf", "fund", "crypto"]);
const DEFENSIVE_TYPES = new Set(["bond", "cash", "savings", "commodity", "currency"]);

// Asset-type keys that map to a catalog label under metrics.assetType.*
const KNOWN_ASSET_TYPES = new Set([
  "stock",
  "etf",
  "fund",
  "crypto",
  "commodity",
  "bond",
  "cash",
  "savings",
  "currency",
]);

const UNKNOWN_SECTOR = "__unknown__";
const ETF_NO_BREAKDOWN = "__etf_nobreakdown__";
// Synthetic sector sentinels for asset classes without a Yahoo sector.
const SECTOR_CRYPTO = "__crypto__";
const SECTOR_COMMODITIES = "__commodities__";
const SECTOR_FIXED_INCOME = "__fixed_income__";
const SECTOR_CASH = "__cash__";
// Country buckets used when no per-holding country is available.
const COUNTRY_DIVERSIFIED = "Diversified";
const COUNTRY_GLOBAL = "Global";
const COUNTRY_NA = "N/A";

function titleCase(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function assetTypeLabel(key: string, t: Translator): string {
  return KNOWN_ASSET_TYPES.has(key) ? t(`assetType.${key}`) : titleCase(key);
}

function sectorLabel(key: string, t: Translator): string {
  switch (key) {
    case UNKNOWN_SECTOR:
      return t("sector.unknown");
    case ETF_NO_BREAKDOWN:
      return t("sector.etfNoBreakdown");
    case SECTOR_CRYPTO:
      return t("sector.crypto");
    case SECTOR_COMMODITIES:
      return t("sector.commodities");
    case SECTOR_FIXED_INCOME:
      return t("sector.fixedIncome");
    case SECTOR_CASH:
      return t("sector.cash");
    default:
      // Real Yahoo sector keys (e.g. "technology") — not in the catalog.
      return titleCase(key);
  }
}

function countryLabel(key: string, t: Translator): string {
  switch (key) {
    case UNKNOWN_SECTOR:
      return t("country.unknown");
    case COUNTRY_DIVERSIFIED:
      return t("country.diversified");
    case COUNTRY_GLOBAL:
      return t("country.global");
    case COUNTRY_NA:
      return t("country.na");
    default:
      // Real country names come from Yahoo (already human-readable).
      return key;
  }
}

/** Turn an accumulation map into sorted slices with percentages. */
function toSlices(
  map: Map<string, number>,
  labeler: (key: string) => string
): AllocationSlice[] {
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  return [...map.entries()]
    .map(([key, value]) => ({
      key,
      label: labeler(key),
      value,
      pct: total > 0 ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

function add(map: Map<string, number>, key: string, value: number) {
  map.set(key, (map.get(key) ?? 0) + value);
}

function bandFor(score: number): RiskBand {
  if (score < 20) return "conservative";
  if (score < 40) return "moderate";
  if (score < 60) return "balanced";
  if (score < 80) return "growth";
  return "aggressive";
}

export async function getAdvisorMetrics(
  userId: string,
  locale: string = "en"
): Promise<AdvisorMetrics> {
  const t = (await getTranslations({ locale, namespace: "metrics" })) as Translator;
  const portfolio = await getPortfolioForUser(userId);
  const { baseCurrency, positions } = portfolio;
  const { totalInvested, totalProfitLoss } = portfolio;

  // Map portfolio-row id -> asset profile (single query, reuses the holdings).
  const rows = await prisma.userPortfolio.findMany({
    where: { userId },
    select: {
      id: true,
      asset: {
        select: {
          id: true,
          assetType: true,
          sector: true,
          country: true,
          sectorWeightings: true,
          profileStatus: true,
        },
      },
    },
  });

  // Lazy safety net: enrich any held asset that was never profiled, then refresh.
  const needsProfile = rows
    .filter((r) => r.asset.profileStatus === null)
    .map((r) => r.asset.id);
  if (needsProfile.length > 0) {
    await Promise.allSettled(needsProfile.map((id) => ensureAssetProfile(id)));
    const refreshed = await prisma.asset.findMany({
      where: { id: { in: needsProfile } },
      select: {
        id: true,
        sector: true,
        country: true,
        sectorWeightings: true,
        profileStatus: true,
      },
    });
    const byId = new Map(refreshed.map((a) => [a.id, a]));
    for (const r of rows) {
      const fresh = byId.get(r.asset.id);
      if (fresh) Object.assign(r.asset, fresh);
    }
  }

  const profileByRow = new Map(rows.map((r) => [r.id, r.asset]));

  const byAssetType = new Map<string, number>();
  const bySector = new Map<string, number>();
  const byCountry = new Map<string, number>();
  const byTypeValue = new Map<string, number>();

  let totalValue = 0;
  let classifiedSectorValue = 0;
  let unknownSectorValue = 0;
  let riskNumerator = 0;
  let equityValue = 0;
  let defensiveValue = 0;
  let cashValue = 0;
  let topHoldingValue = 0;
  let topHoldingLabel = "";

  for (const pos of positions) {
    const value = pos.currentValue;
    if (value == null || value <= 0) continue;
    const type = pos.assetType;
    const profile = profileByRow.get(pos.id);

    totalValue += value;
    if (value > topHoldingValue) {
      topHoldingValue = value;
      topHoldingLabel = pos.name || pos.symbol;
    }
    if (type === "cash" || type === "savings") cashValue += value;
    add(byAssetType, type, value);
    add(byTypeValue, type, value);

    // Risk
    const weight = RISK_WEIGHTS[type] ?? 0.5;
    riskNumerator += value * weight;
    if (EQUITY_TYPES.has(type)) equityValue += value;
    else if (DEFENSIVE_TYPES.has(type)) defensiveValue += value;

    // Sector
    if (type === "stock") {
      const sector = profile?.sector ?? null;
      if (sector) {
        add(bySector, sector, value);
        classifiedSectorValue += value;
      } else {
        add(bySector, UNKNOWN_SECTOR, value);
        unknownSectorValue += value;
      }
    } else if (type === "etf" || type === "fund") {
      const weightings = profile?.sectorWeightings as
        | Record<string, number>
        | null
        | undefined;
      if (weightings && Object.keys(weightings).length > 0) {
        for (const [sectorKey, w] of Object.entries(weightings)) {
          add(bySector, sectorKey, value * w);
        }
        classifiedSectorValue += value;
      } else {
        add(bySector, ETF_NO_BREAKDOWN, value);
        unknownSectorValue += value;
      }
    } else {
      // Synthetic sector buckets for asset classes without a Yahoo sector.
      const synthetic =
        type === "crypto"
          ? SECTOR_CRYPTO
          : type === "commodity"
            ? SECTOR_COMMODITIES
            : type === "bond"
              ? SECTOR_FIXED_INCOME
              : SECTOR_CASH;
      add(bySector, synthetic, value);
      classifiedSectorValue += value;
    }

    // Country
    if (type === "stock") {
      add(byCountry, profile?.country ?? UNKNOWN_SECTOR, value);
    } else if (type === "etf" || type === "fund") {
      add(byCountry, "Diversified", value);
    } else if (type === "crypto" || type === "commodity") {
      add(byCountry, "Global", value);
    } else {
      add(byCountry, "N/A", value);
    }
  }

  const score = totalValue > 0 ? (riskNumerator / totalValue) * 100 : 0;

  const breakdown = [...byTypeValue.entries()]
    .map(([key, value]) => ({
      key,
      label: assetTypeLabel(key, t),
      value,
      weight: RISK_WEIGHTS[key] ?? 0.5,
    }))
    .sort((a, b) => b.value - a.value);

  const classifiableTotal = classifiedSectorValue + unknownSectorValue;

  const sectorSlices = toSlices(bySector, (k) => sectorLabel(k, t));
  const countrySlices = toSlices(byCountry, (k) => countryLabel(k, t));
  const typeSlices = toSlices(byAssetType, (k) => assetTypeLabel(k, t));

  const topHoldingPct = totalValue > 0 ? (topHoldingValue / totalValue) * 100 : 0;
  const equityPct = totalValue > 0 ? (equityValue / totalValue) * 100 : 0;
  const defensivePct = totalValue > 0 ? (defensiveValue / totalValue) * 100 : 0;
  const cashPct = totalValue > 0 ? (cashValue / totalValue) * 100 : 0;

  const insights = buildInsights(
    {
      topHoldingPct,
      topHoldingLabel,
      topSector: sectorSlices[0] ?? null,
      topCountry: countrySlices[0] ?? null,
      defensivePct,
      cashPct,
    },
    t
  );

  return {
    baseCurrency,
    totalValue,
    totalInvested,
    totalProfitLoss,
    profitLossPct: totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : null,
    topHolding: topHoldingLabel ? { label: topHoldingLabel, pct: topHoldingPct } : null,
    byAssetType: typeSlices,
    bySector: sectorSlices,
    byCountry: countrySlices,
    riskProfile: {
      score: Math.round(score),
      band: bandFor(score),
      equityPct,
      defensivePct,
      breakdown,
    },
    coverage: {
      profiledPct:
        classifiableTotal > 0 ? (classifiedSectorValue / classifiableTotal) * 100 : 100,
      unknownPct:
        classifiableTotal > 0 ? (unknownSectorValue / classifiableTotal) * 100 : 0,
    },
    insights,
  };
}

/** Deterministic, conservative observations. Describes, never recommends a trade. */
function buildInsights(
  input: {
    topHoldingPct: number;
    topHoldingLabel: string;
    topSector: AllocationSlice | null;
    topCountry: AllocationSlice | null;
    defensivePct: number;
    cashPct: number;
  },
  t: Translator
): AdvisorInsight[] {
  const out: AdvisorInsight[] = [];

  if (input.topHoldingPct >= 40) {
    out.push({
      id: "concentration-holding",
      severity: "warn",
      text: t("insight.concentrationHolding", {
        pct: Math.round(input.topHoldingPct),
        name: input.topHoldingLabel,
      }),
    });
  }

  if (input.topSector && input.topSector.pct >= 60) {
    out.push({
      id: "concentration-sector",
      severity: "warn",
      text: t("insight.concentrationSector", {
        pct: Math.round(input.topSector.pct),
        sector: input.topSector.label,
      }),
    });
  }

  if (input.topCountry && input.topCountry.pct >= 70 && input.topCountry.key !== "N/A") {
    out.push({
      id: "concentration-country",
      severity: "info",
      text: t("insight.concentrationCountry", {
        pct: Math.round(input.topCountry.pct),
        country: input.topCountry.label,
      }),
    });
  }

  if (input.defensivePct < 5) {
    out.push({
      id: "no-defensive",
      severity: "info",
      text: t("insight.noDefensive"),
    });
  }

  if (input.cashPct >= 25) {
    out.push({
      id: "cash-drag",
      severity: "info",
      text: t("insight.cashDrag", { pct: Math.round(input.cashPct) }),
    });
  }

  return out;
}
