// src/services/marketDataService.js
// Servicio unificado para obtener datos de mercado via Yahoo Finance

import { getYahooQuote } from "./yahooFinanceService.js";

/**
 * Obtiene la cotización actual de un símbolo via Yahoo Finance
 * @param {string} symbol - Símbolo en formato Yahoo Finance
 */
export async function getQuote(symbol) {
  const quote = await getYahooQuote(symbol);
  return quote;
}

/**
 * Obtiene tipo de cambio entre dos monedas
 * Usa Frankfurter API (gratuita y sin API key)
 */
export async function getFxRate(fromCurrency, toCurrency) {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) return 1;

  const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(
    from
  )}&to=${encodeURIComponent(to)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Error al llamar a Frankfurter: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  const rate = data.rates?.[to];

  if (typeof rate !== "number") {
    throw new Error(
      `No se encontró tipo de cambio de ${from} a ${to} en Frankfurter`
    );
  }

  return rate;
}