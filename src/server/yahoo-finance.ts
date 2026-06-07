import "server-only";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export async function getYahooQuote(symbol: string) {
  const yahooSymbol = symbol.toUpperCase();
  const quote = await yahooFinance.quote(yahooSymbol, {}, { validateResult: false });

  if (!quote || quote.regularMarketPrice === undefined) {
    throw new Error(`Yahoo Finance returned no price for ${yahooSymbol}`);
  }

  return {
    symbol,
    yahooSymbol,
    currentPrice: quote.regularMarketPrice,
    open: quote.regularMarketOpen,
    high: quote.regularMarketDayHigh,
    low: quote.regularMarketDayLow,
    previousClose: quote.regularMarketPreviousClose,
    volume: quote.regularMarketVolume,
    marketCap: quote.marketCap,
    currency: quote.currency,
    source: "yahoo" as const,
  };
}

export async function validateSymbol(symbol: string): Promise<boolean> {
  try {
    const yahooSymbol = symbol.toUpperCase();
    const quote = await yahooFinance.quote(yahooSymbol, {}, { validateResult: false });
    return quote != null && quote.regularMarketPrice !== undefined;
  } catch {
    return false;
  }
}

// Map Yahoo quoteType values to the asset types this app understands.
const QUOTE_TYPE_TO_ASSET_TYPE: Record<string, string> = {
  EQUITY: "stock",
  ETF: "etf",
  MUTUALFUND: "fund",
  CRYPTOCURRENCY: "crypto",
  FUTURE: "commodity",
};

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  exchange: string | null;
  assetType: string;
}

/**
 * Free-text symbol search against Yahoo Finance. Accepts tickers, names and
 * ISINs. Returns only instruments we can model (equities, ETFs, mutual funds,
 * crypto, commodities).
 */
export async function searchSymbols(query: string): Promise<SymbolSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const result = (await yahooFinance.search(
    q,
    { quotesCount: 15, newsCount: 0 },
    { validateResult: false }
  )) as { quotes?: unknown[] };
  const quotes = (result.quotes ?? []) as Array<Record<string, unknown>>;

  const seen = new Set<string>();
  const out: SymbolSearchResult[] = [];

  for (const item of quotes) {
    const symbol = typeof item.symbol === "string" ? item.symbol : "";
    const quoteType = typeof item.quoteType === "string" ? item.quoteType : "";
    const assetType = QUOTE_TYPE_TO_ASSET_TYPE[quoteType];
    if (!symbol || !assetType || seen.has(symbol)) continue;
    seen.add(symbol);

    const longname = typeof item.longname === "string" ? item.longname : "";
    const shortname = typeof item.shortname === "string" ? item.shortname : "";
    const exchDisp = typeof item.exchDisp === "string" ? item.exchDisp : "";
    const exchange = typeof item.exchange === "string" ? item.exchange : "";

    out.push({
      symbol,
      name: longname || shortname || symbol,
      exchange: exchDisp || exchange || null,
      assetType,
    });
  }

  // Yahoo returns mutual funds under cryptic Morningstar symbols (e.g.
  // "0P00000RQC.F") and gives no readable name in search results — `name` ends
  // up equal to the symbol. Resolve the real fund names in a single batch quote
  // so the search list shows "Vanguard Global Stock Index" instead of a code.
  const fundSymbols = out
    .filter((r) => r.assetType === "fund" && r.name === r.symbol)
    .map((r) => r.symbol);

  if (fundSymbols.length > 0) {
    try {
      const quotes = (await yahooFinance.quote(
        fundSymbols,
        {},
        { validateResult: false }
      )) as unknown;
      const arr = (Array.isArray(quotes) ? quotes : [quotes]) as Array<Record<string, unknown>>;
      const nameBySymbol = new Map<string, string>();
      for (const q of arr) {
        const sym = typeof q.symbol === "string" ? q.symbol : "";
        const longName = typeof q.longName === "string" ? q.longName : "";
        const shortName = typeof q.shortName === "string" ? q.shortName : "";
        const name = longName || shortName;
        if (sym && name && name !== sym) nameBySymbol.set(sym, name);
      }
      for (const r of out) {
        const name = nameBySymbol.get(r.symbol);
        if (name) r.name = name;
      }
    } catch {
      // Name resolution is best-effort: keep the cryptic symbol rather than
      // failing the whole search.
    }
  }

  return out;
}

export async function getHistoricalData(
  symbol: string,
  startDate: Date,
  endDate: Date,
  interval: "1d" | "1wk" | "1mo"
) {
  const yahooSymbol = symbol.toUpperCase();

  // chart() replaces the deprecated historical() (Yahoo removed its endpoint).
  // Data now lives under `quotes`, and OHLCV can be null on incomplete candles.
  const result = (await yahooFinance.chart(
    yahooSymbol,
    {
      period1: startDate,
      period2: endDate,
      interval,
    },
    { validateResult: false }
  )) as {
    quotes?: Array<{
      date: Date;
      open: number | null;
      high: number | null;
      low: number | null;
      close: number | null;
      volume: number | null;
    }>;
  };

  const quotes = result?.quotes ?? [];
  if (quotes.length === 0) {
    throw new Error(`No historical data available for ${yahooSymbol}`);
  }

  return quotes
    .filter((q) => q.close != null) // drop incomplete candles
    .map((item) => ({
      date: item.date.toISOString().split("T")[0],
      open: item.open ?? item.close!,
      high: item.high ?? item.close!,
      low: item.low ?? item.close!,
      close: item.close!,
      volume: item.volume ?? 0,
      currency: "USD",
    }));
}
