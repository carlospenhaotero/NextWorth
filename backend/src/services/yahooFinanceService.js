// src/services/yahooFinanceService.js
// Servicio para obtener precios de activos desde Yahoo Finance
// Los símbolos ya vienen en formato Yahoo Finance desde el frontend

import YahooFinance from "yahoo-finance2";

// Instanciar Yahoo Finance (requerido en v3)
const yahooFinance = new YahooFinance();

/**
 * Obtiene la cotización actual de un símbolo desde Yahoo Finance
 * @param {string} symbol - Símbolo en formato Yahoo Finance (ej: AAPL, BTC-USD, GC=F)
 */
export async function getYahooQuote(symbol) {
    const yahooSymbol = symbol.toUpperCase();

    console.log(`📊 Consultando Yahoo Finance: ${yahooSymbol}`);

    const quote = await yahooFinance.quote(yahooSymbol);

    if (!quote || quote.regularMarketPrice === undefined) {
        throw new Error(`Yahoo Finance no devolvió precio para ${yahooSymbol}`);
    }

    return {
        symbol: symbol,
        yahooSymbol: yahooSymbol,
        currentPrice: quote.regularMarketPrice,
        open: quote.regularMarketOpen,
        high: quote.regularMarketDayHigh,
        low: quote.regularMarketDayLow,
        previousClose: quote.regularMarketPreviousClose,
        volume: quote.regularMarketVolume,
        marketCap: quote.marketCap,
        currency: quote.currency,
        source: "yahoo",
    };
}

/**
 * Verifica si un símbolo existe en Yahoo Finance
 */
export async function validateSymbol(symbol) {
    try {
        const yahooSymbol = symbol.toUpperCase();
        const quote = await yahooFinance.quote(yahooSymbol);
        return quote && quote.regularMarketPrice !== undefined;
    } catch {
        return false;
    }
}

/**
 * Fetches historical price data from Yahoo Finance
 * @param {string} symbol - Yahoo Finance symbol (e.g., AAPL, BTC-USD)
 * @param {Date} startDate - Start date for historical data
 * @param {Date} endDate - End date for historical data
 * @param {string} interval - Data interval: '1d', '1wk', '1mo'
 * @returns {Promise<Array>} Historical data points with OHLCV data
 */
export async function getHistoricalData(symbol, startDate, endDate, interval) {
    const yahooSymbol = symbol.toUpperCase();

    console.log(`📈 Fetching historical data for ${yahooSymbol} (${interval})`);

    try {
        const result = await yahooFinance.historical(yahooSymbol, {
            period1: startDate,
            period2: endDate,
            interval: interval
        });

        if (!result || result.length === 0) {
            throw new Error(`No historical data available for ${yahooSymbol}`);
        }

        // Transform to standardized format
        return result.map(item => ({
            date: item.date.toISOString().split('T')[0], // YYYY-MM-DD
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume || 0,
            currency: 'USD' // Yahoo doesn't always provide currency, default to USD
        }));

    } catch (error) {
        console.error(`❌ Yahoo Finance historical fetch failed for ${yahooSymbol}:`, error.message);
        throw error;
    }
}

export default {
    getQuote: getYahooQuote,
    validateSymbol,
    getHistoricalData,
};
