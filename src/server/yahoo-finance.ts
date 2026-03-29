import "server-only";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export async function getYahooQuote(symbol: string) {
  const yahooSymbol = symbol.toUpperCase();
  const quote = await yahooFinance.quote(yahooSymbol);

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
    const quote = await yahooFinance.quote(yahooSymbol);
    return quote != null && quote.regularMarketPrice !== undefined;
  } catch {
    return false;
  }
}

export async function getHistoricalData(
  symbol: string,
  startDate: Date,
  endDate: Date,
  interval: "1d" | "1wk" | "1mo"
) {
  const yahooSymbol = symbol.toUpperCase();

  const result = await yahooFinance.historical(yahooSymbol, {
    period1: startDate,
    period2: endDate,
    interval,
  });

  if (!result || result.length === 0) {
    throw new Error(`No historical data available for ${yahooSymbol}`);
  }

  return result.map((item) => ({
    date: item.date.toISOString().split("T")[0],
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
    volume: item.volume || 0,
    currency: "USD",
  }));
}
