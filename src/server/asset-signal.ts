import "server-only";
import { prisma } from "@/server/db";
import { getAssetHistory } from "@/server/market-data";
import { getAdvisorMetrics, RISK_WEIGHTS, type RiskBand } from "@/server/advisor/metrics";

/**
 * Señal educativa por activo: momentum, volatilidad y clase de riesgo derivados
 * del histórico de precios, más el encaje con la banda de riesgo de la cartera.
 * Todo es descriptivo y determinista: NO recomienda comprar ni vender. Responde
 * al punto 7 del feedback del tutor respetando el enfoque de copiloto educativo.
 */

export type MomentumBand = "strongUp" | "up" | "flat" | "down" | "strongDown";
export type VolatilityBand = "low" | "medium" | "high";
export type RiskClass = "low" | "medium" | "high";
export type FitVerdict = "aligned" | "above" | "below";

export interface AssetSignal {
  symbol: string;
  assetType: string;
  momentum: {
    r3m: number | null;
    r6m: number | null;
    r12m: number | null;
    band: MomentumBand;
  };
  volatility: {
    annualizedPct: number;
    band: VolatilityBand;
  };
  risk: {
    class: RiskClass;
    weight: number;
  };
  // null cuando no se puede leer la cartera (encaje omitido, no bloquea la señal).
  fit: {
    verdict: FitVerdict;
    portfolioBand: RiskBand;
  } | null;
}

// Tipos con serie de mercado real (los únicos con momentum/volatilidad medibles).
// currency (FX) queda fuera a propósito: no es una inversión de la cartera.
const MARKET_TYPES = new Set(["stock", "etf", "fund", "crypto", "commodity"]);

// Mínimo de puntos mensuales para que la volatilidad sea mínimamente significativa.
const MIN_POINTS = 6;

// Umbrales calibrables. Momentum sobre la ventana de 6m (retorno acumulado, %).
const MOMENTUM_STRONG = 20;
const MOMENTUM_MILD = 5;
// Volatilidad anualizada de los retornos mensuales (%).
const VOL_LOW_MAX = 15;
const VOL_MEDIUM_MAX = 35;

/** Punto de precio con su momento en el tiempo (ms) y cierre. */
export interface SignalPoint {
  time: number; // epoch ms
  close: number;
}

const DAY_MS = 86_400_000;
// Tolerancia al buscar el precio de hace N meses: si la serie empieza un poco
// después del objetivo, se acepta el punto más cercano (evita null por pocos días).
const MONTH_GRACE_DAYS = 20;

/**
 * Retorno acumulado sobre los últimos `months` meses reales, localizando el
 * precio por fecha (no por índice). Robusto al espaciado de la serie (diario,
 * semanal o mensual). null si la serie no cubre esa ventana.
 */
export function returnOverMonths(points: SignalPoint[], months: number): number | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const first = points[0];

  const targetDate = new Date(last.time);
  targetDate.setMonth(targetDate.getMonth() - months);
  const targetTime = targetDate.getTime();

  // La serie no llega tan atrás (con una pequeña gracia): sin dato.
  if (targetTime < first.time - MONTH_GRACE_DAYS * DAY_MS) return null;

  // Punto más cercano en el tiempo al objetivo.
  let past = first;
  let bestDiff = Math.abs(first.time - targetTime);
  for (const p of points) {
    const diff = Math.abs(p.time - targetTime);
    if (diff < bestDiff) {
      bestDiff = diff;
      past = p;
    }
  }
  if (!(past.close > 0)) return null;
  return (last.close / past.close - 1) * 100;
}

/** Retornos periodo a periodo (fracción, no %). */
export function periodicReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1];
    if (prev > 0) out.push(closes[i] / prev - 1);
  }
  return out;
}

/**
 * Periodos por año inferidos del espaciado medio real de la serie. Diario ~252,
 * semanal ~52, mensual ~12. Evita anualizar con un factor equivocado.
 */
export function inferPeriodsPerYear(points: SignalPoint[]): number {
  if (points.length < 2) return 252;
  const span = points[points.length - 1].time - points[0].time;
  const avgGapDays = span / (points.length - 1) / DAY_MS;
  if (!(avgGapDays > 0)) return 252;
  return 365.25 / avgGapDays;
}

/** Volatilidad anualizada (%): stdev de los retornos * sqrt(periodos por año). */
export function annualizedVolatility(points: SignalPoint[]): number {
  const returns = periodicReturns(points.map((p) => p.close));
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(inferPeriodsPerYear(points)) * 100;
}

export function momentumBand(primaryReturn: number | null): MomentumBand {
  if (primaryReturn == null) return "flat";
  if (primaryReturn >= MOMENTUM_STRONG) return "strongUp";
  if (primaryReturn >= MOMENTUM_MILD) return "up";
  if (primaryReturn <= -MOMENTUM_STRONG) return "strongDown";
  if (primaryReturn <= -MOMENTUM_MILD) return "down";
  return "flat";
}

export function volatilityBand(annualizedPct: number): VolatilityBand {
  if (annualizedPct < VOL_LOW_MAX) return "low";
  if (annualizedPct < VOL_MEDIUM_MAX) return "medium";
  return "high";
}

export function riskClassFor(assetType: string): { class: RiskClass; weight: number } {
  const weight = RISK_WEIGHTS[assetType] ?? 0.5;
  const cls: RiskClass = weight <= 0.25 ? "low" : weight <= 0.6 ? "medium" : "high";
  return { class: cls, weight };
}

/** Colapsa la banda de riesgo de la cartera (5 niveles) a una clase (3 niveles). */
function portfolioBandToClass(band: RiskBand): RiskClass {
  if (band === "conservative" || band === "moderate") return "low";
  if (band === "balanced") return "medium";
  return "high"; // growth | aggressive
}

const CLASS_ORDER: Record<RiskClass, number> = { low: 0, medium: 1, high: 2 };

export function fitVerdict(assetClass: RiskClass, portfolioBand: RiskBand): FitVerdict {
  const diff = CLASS_ORDER[assetClass] - CLASS_ORDER[portfolioBandToClass(portfolioBand)];
  if (diff > 0) return "above";
  if (diff < 0) return "below";
  return "aligned";
}

/**
 * Ensambla la señal de un activo. Devuelve null si el tipo no tiene serie de
 * mercado (cash/savings/bond/manual/currency) o si no hay historia suficiente.
 */
export async function getAssetSignal(
  userId: string,
  symbol: string,
  locale = "en"
): Promise<AssetSignal | null> {
  // El tipo del activo se toma de lo que el usuario POSEE, no del histórico:
  // un símbolo como "CASH" existe como acción real en Yahoo y engañaría al gate.
  // Además esto ancla el cálculo al activo del usuario (evita IDOR/cross-user).
  const holding = await prisma.userPortfolio.findFirst({
    where: { userId, asset: { symbol: { equals: symbol, mode: "insensitive" } } },
    select: { asset: { select: { symbol: true, assetType: true } } },
  });
  if (!holding) return null;

  const { assetType } = holding.asset;
  if (!MARKET_TYPES.has(assetType)) return null;

  const history = await getAssetHistory(holding.asset.symbol, 24, "1mo", 3600);

  const points: SignalPoint[] = history.series
    .map((p) => ({ time: p.timestamp, close: p.close }))
    .filter((p) => typeof p.close === "number" && p.close > 0 && p.time > 0);

  if (points.length < MIN_POINTS) return null;

  const r3m = returnOverMonths(points, 3);
  const r6m = returnOverMonths(points, 6);
  const r12m = returnOverMonths(points, 12);
  const primary = r6m ?? r3m ?? r12m;

  const annualizedPct = annualizedVolatility(points);
  const risk = riskClassFor(assetType);

  // El encaje reutiliza la banda de riesgo derivada de la cartera. Si falla la
  // lectura de la cartera, se omite el encaje pero la señal sigue siendo útil.
  let fit: AssetSignal["fit"] = null;
  try {
    const metrics = await getAdvisorMetrics(userId, locale);
    if (metrics.totalValue > 0) {
      fit = {
        verdict: fitVerdict(risk.class, metrics.riskProfile.band),
        portfolioBand: metrics.riskProfile.band,
      };
    }
  } catch {
    fit = null;
  }

  return {
    symbol: holding.asset.symbol,
    assetType,
    momentum: { r3m, r6m, r12m, band: momentumBand(primary) },
    volatility: { annualizedPct, band: volatilityBand(annualizedPct) },
    risk,
    fit,
  };
}
