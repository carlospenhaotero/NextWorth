import "server-only";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export interface QuoteResult {
  symbol: string;
  yahooSymbol: string;
  currentPrice: number;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
  volume?: number;
  marketCap?: number;
  currency?: string;
  dividendRate: number | null;
  dividendYield: number | null;
  source: "yahoo";
}

// Shared mapper so the single and batch quote paths return the exact same shape.
// `requested` is the caller's original symbol (preserves case/aliasing).
function mapQuote(requested: string, quote: Record<string, unknown>): QuoteResult {
  return {
    symbol: requested,
    yahooSymbol: requested.toUpperCase(),
    currentPrice: quote.regularMarketPrice as number,
    open: quote.regularMarketOpen as number | undefined,
    high: quote.regularMarketDayHigh as number | undefined,
    low: quote.regularMarketDayLow as number | undefined,
    previousClose: quote.regularMarketPreviousClose as number | undefined,
    volume: quote.regularMarketVolume as number | undefined,
    marketCap: quote.marketCap as number | undefined,
    currency: quote.currency as string | undefined,
    dividendRate: (quote.trailingAnnualDividendRate as number | undefined) ?? null,
    dividendYield: (quote.trailingAnnualDividendYield as number | undefined) ?? null,
    source: "yahoo",
  };
}

export async function getYahooQuote(symbol: string): Promise<QuoteResult> {
  const yahooSymbol = symbol.toUpperCase();
  const quote = (await yahooFinance.quote(
    yahooSymbol,
    {},
    { validateResult: false }
  )) as Record<string, unknown> | undefined;

  if (!quote || quote.regularMarketPrice === undefined) {
    throw new Error(`Yahoo Finance returned no price for ${yahooSymbol}`);
  }

  return mapQuote(symbol, quote);
}

// Yahoo's quote endpoint accepts many symbols per call; keep chunks modest so a
// single failing/oversized request can't sink the whole batch.
const QUOTE_CHUNK_SIZE = 50;

/**
 * Batch quotes: one Yahoo call per chunk of ~50 symbols, chunks fetched in
 * parallel. Returns a Map keyed by UPPERCASED symbol. Symbols that error or come
 * back without a price are simply absent from the map (the caller falls back to
 * cost). A whole chunk failing is swallowed so it can't sink the others.
 */
export async function getYahooQuotes(symbols: string[]): Promise<Map<string, QuoteResult>> {
  const unique = Array.from(new Set(symbols.map((s) => s.toUpperCase())));
  const out = new Map<string, QuoteResult>();
  if (unique.length === 0) return out;

  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += QUOTE_CHUNK_SIZE) {
    chunks.push(unique.slice(i, i + QUOTE_CHUNK_SIZE));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const res = (await yahooFinance.quote(chunk, {}, { validateResult: false })) as unknown;
        const arr = (Array.isArray(res) ? res : [res]) as Array<Record<string, unknown>>;
        for (const q of arr) {
          const sym = typeof q?.symbol === "string" ? q.symbol.toUpperCase() : "";
          if (!sym || q.regularMarketPrice === undefined) continue;
          out.set(sym, mapQuote(sym, q));
        }
      } catch {
        // Chunk failed entirely: leave its symbols out so they fall back to cost.
      }
    })
  );

  return out;
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

export interface YahooNewsItem {
  title: string;
  publisher: string | null;
  link: string;
  /** ISO-8601 publish time, or null when Yahoo omits it. */
  publishedAt: string | null;
}

/**
 * Recent news headlines for a symbol, via Yahoo Finance search (news channel).
 * Best-effort and metadata-only: title, publisher, link and publish time. The
 * article bodies are never fetched — we only surface headlines that link out.
 */
export async function getYahooNews(symbol: string, count = 8): Promise<YahooNewsItem[]> {
  const yahooSymbol = symbol.toUpperCase();

  const result = (await yahooFinance.search(
    yahooSymbol,
    { quotesCount: 0, newsCount: count },
    { validateResult: false }
  )) as { news?: Array<Record<string, unknown>> };
  const news = result.news ?? [];

  const out: YahooNewsItem[] = [];
  const seen = new Set<string>();

  for (const item of news) {
    const link = typeof item.link === "string" ? item.link : "";
    const title = typeof item.title === "string" ? item.title : "";
    if (!link || !title || seen.has(link)) continue;
    seen.add(link);

    const publisher = typeof item.publisher === "string" ? item.publisher : null;

    // providerPublishTime comes back as a Date in yahoo-finance2, but older
    // shapes use unix seconds. Handle both, drop anything unparseable.
    let publishedAt: string | null = null;
    const raw = item.providerPublishTime;
    if (raw instanceof Date && !isNaN(raw.getTime())) {
      publishedAt = raw.toISOString();
    } else if (typeof raw === "number" && raw > 0) {
      publishedAt = new Date(raw * 1000).toISOString();
    }

    out.push({ title, publisher, link, publishedAt });
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
