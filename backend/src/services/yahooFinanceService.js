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

export default {
    getQuote: getYahooQuote,
    validateSymbol,
};
