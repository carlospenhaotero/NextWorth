import "server-only";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { env } from "@/lib/env";
import { prisma } from "@/server/db";
import { getYahooNews } from "@/server/yahoo-finance";
import type { Locale } from "@/i18n/config";

export interface AssetNewsItem {
  title: string;
  publisher: string | null;
  link: string;
  publishedAt: string | null;
}

export interface AssetNewsResult {
  symbol: string;
  items: AssetNewsItem[];
  /** Short neutral overview of the headlines, or null when unavailable. */
  summary: string | null;
  /** Whether the summary came from the model (null when there is no summary). */
  summarySource: "ai" | null;
}

// Headlines are ephemeral and low-value to persist, so we skip the DB entirely
// and keep a short-lived in-memory cache. A 30-minute TTL keeps Yahoo/Gemini
// calls cheap without the app ever showing stale-looking news.
const TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { expires: number; data: AssetNewsResult }>();

async function summarize(
  symbol: string,
  name: string,
  items: AssetNewsItem[],
  locale: Locale
): Promise<string | null> {
  if (!env.GOOGLE_GENERATIVE_AI_API_KEY || items.length === 0) return null;

  const language = locale === "es" ? "Spanish" : "English";
  const headlines = items
    .map((it, i) => `${i + 1}. ${it.title}${it.publisher ? ` (${it.publisher})` : ""}`)
    .join("\n");

  const system = [
    "You are the NextWorth Advisor, an educational portfolio copilot for a retail investor.",
    `Write the answer in ${language}.`,
    "In 2-3 short sentences, neutrally summarize what recent news headlines say about this asset.",
    "Describe the themes only. Never recommend buying or selling, never give price targets or predicted returns, never speculate beyond what the headlines state.",
    "Do not add a disclaimer sentence (the interface shows one). Do not use bullet points or headings; plain prose only.",
  ].join(" ");

  const prompt = [`Asset: ${name} (${symbol}).`, "Recent headlines:", headlines].join("\n");

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
 * Recent news for an asset the user owns, with an optional AI overview. The
 * ownership gate anchors the symbol to the user (no cross-user leakage) and
 * stops the endpoint from being used as an open Yahoo-news proxy. Selection is
 * best-effort: a Yahoo failure yields an empty list rather than an error, and
 * the summary falls back to null (headlines only) when Gemini is unavailable.
 */
export async function getAssetNews(
  userId: string,
  symbol: string,
  locale: Locale
): Promise<AssetNewsResult> {
  const holding = await prisma.userPortfolio.findFirst({
    where: { userId, asset: { symbol: { equals: symbol, mode: "insensitive" } } },
    select: { asset: { select: { symbol: true, name: true } } },
  });
  if (!holding) return { symbol, items: [], summary: null, summarySource: null };

  const canonical = holding.asset.symbol;
  const cacheKey = `${canonical}:${locale}`;
  const now = Date.now();
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > now) return hit.data;

  let items: AssetNewsItem[] = [];
  try {
    const raw = await getYahooNews(canonical, 8);
    items = raw.map((n) => ({
      title: n.title,
      publisher: n.publisher,
      link: n.link,
      publishedAt: n.publishedAt,
    }));
  } catch {
    items = [];
  }

  // Nothing to show: return without caching so a transient Yahoo failure is
  // retried on the next visit instead of being pinned empty for the whole TTL.
  if (items.length === 0) {
    return { symbol: canonical, items: [], summary: null, summarySource: null };
  }

  const summary = await summarize(canonical, holding.asset.name, items, locale);
  const data: AssetNewsResult = {
    symbol: canonical,
    items,
    summary,
    summarySource: summary ? "ai" : null,
  };

  cache.set(cacheKey, { expires: now + TTL_MS, data });
  return data;
}
