import "server-only";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { env } from "@/lib/env";
import { getAdvisorMetrics, type AdvisorMetrics } from "@/server/advisor/metrics";
import { getExistingPositionsLite } from "@/queries/portfolio";
import {
  selectSuggestionCandidates,
  TYPE_LABELS,
  type AssetSuggestion,
  type AssetSuggestionsResult,
} from "@/lib/diversification";
import type { Locale } from "@/i18n/config";

export type { AssetSuggestion, AssetSuggestionsResult } from "@/lib/diversification";

function fallbackExplanation(gapTypes: string[], locale: Locale): string {
  const labels = gapTypes.map((t) => TYPE_LABELS[locale][t] ?? t);
  const list = labels.join(locale === "es" ? " y " : " and ");
  if (locale === "es") {
    return `Tu cartera está concentrada en pocas clases de activo. Añadir algo de exposición a ${list} ayudaría a repartir el riesgo entre activos que no se mueven igual. Son ejemplos ilustrativos para diversificar, no una recomendación de compra.`;
  }
  return `Your portfolio is concentrated in a few asset classes. Adding some exposure to ${list} would help spread risk across assets that don't move in lockstep. These are illustrative diversification examples, not a buy recommendation.`;
}

async function aiExplanation(
  metrics: AdvisorMetrics,
  gapTypes: string[],
  picks: AssetSuggestion[],
  locale: Locale
): Promise<string | null> {
  if (!env.GOOGLE_GENERATIVE_AI_API_KEY) return null;

  const language = locale === "es" ? "Spanish" : "English";
  const allocation =
    metrics.byAssetType.length > 0
      ? metrics.byAssetType.map((s) => `${s.label}: ${s.pct.toFixed(0)}%`).join(", ")
      : "empty portfolio";
  const gapLabels = gapTypes.map((t) => TYPE_LABELS[locale][t] ?? t).join(", ");
  const examples = picks.map((p) => `${p.name} (${p.assetType})`).join(", ");

  const system = [
    "You are the NextWorth Advisor, an educational portfolio copilot for a retail investor.",
    `Write the answer in ${language}.`,
    "Explain in 2-3 short sentences why adding exposure to the given asset classes would improve the diversification of a portfolio with the described current allocation.",
    "These are illustrative educational examples, NOT buy recommendations. Never use imperative 'buy/sell' language, never give price targets or predicted returns, never name specific tickers as things to purchase.",
    "Do not add a disclaimer sentence (the interface shows one). Do not use bullet points or headings; plain prose only.",
  ].join(" ");

  const prompt = [
    `Current allocation by asset type: ${allocation}.`,
    `Risk profile: ${metrics.riskProfile.band} (equity ${metrics.riskProfile.equityPct.toFixed(0)}%, defensive ${metrics.riskProfile.defensivePct.toFixed(0)}%).`,
    `Under-represented asset classes to explain: ${gapLabels}.`,
    `Example instruments shown to the user (for context only, do not tell them to buy these): ${examples}.`,
  ].join("\n");

  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      system,
      prompt,
    });
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

/**
 * Suggests a few catalog assets that would diversify the user's portfolio.
 * Selection is deterministic (diversification gaps); Gemini only writes the
 * "why", with a deterministic fallback when the model is unavailable.
 */
export async function getAssetSuggestions(
  userId: string,
  locale: Locale
): Promise<AssetSuggestionsResult> {
  const [metrics, owned] = await Promise.all([
    getAdvisorMetrics(userId, locale),
    getExistingPositionsLite(userId),
  ]);
  const ownedSymbols = new Set(owned.map((p) => p.symbol));

  const { picks, gapTypes } = selectSuggestionCandidates(metrics, ownedSymbols);

  const ai = picks.length > 0 ? await aiExplanation(metrics, gapTypes, picks, locale) : null;

  return {
    picks,
    gapTypes,
    explanation: ai ?? fallbackExplanation(gapTypes, locale),
    source: ai ? "ai" : "fallback",
  };
}
