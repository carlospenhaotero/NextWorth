import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { headers } from "next/headers";
import { getAssetHistory } from "@/server/market-data";
import { computeVariations } from "@/lib/variation";

// Bounds the fan-out: the add-asset catalog is ~68 symbols, so one page never
// asks for more than this.
const MAX_SYMBOLS = 80;

/**
 * Batch variation endpoint for the add-asset catalog grid. Given a
 * comma-separated `symbols` list, returns today's and 7-day price variation
 * per symbol in a single round trip. Each symbol resolves from 1 month of
 * daily closes in preview mode (no DB writes); getAssetHistory already dedupes
 * in-flight calls and caches, so popular symbols stay cheap across users.
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = request.nextUrl.searchParams.get("symbols") || "";
  const symbols = Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    )
  ).slice(0, MAX_SYMBOLS);

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: [] });
  }

  const quotes = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const history = await getAssetHistory(symbol, 1, "1d", 3600, { persist: false });
        return { symbol, ...computeVariations(history.series) };
      } catch {
        // A single symbol failing must not fail the whole batch.
        return { symbol, price: null, todayPct: null, weekPct: null };
      }
    })
  );

  return NextResponse.json({ quotes });
}
