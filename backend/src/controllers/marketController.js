// src/controllers/marketController.js
// Controller for market data endpoints

import { getAssetHistory as getAssetHistoryService } from "../services/marketDataService.js";

/**
 * GET /api/market/history/:symbol
 * Fetches historical price data for an asset with intelligent caching
 */
export const getAssetHistory = async (req, res) => {
  const { symbol } = req.params;
  const { range = "24m", interval = "1mo" } = req.query;

  // Validation: Symbol is required
  if (!symbol) {
    return res.status(400).json({
      error: "El símbolo del activo es obligatorio"
    });
  }

  // Validation: Range must be valid
  const validRanges = ["6m", "12m", "24m", "60m"];
  if (!validRanges.includes(range)) {
    return res.status(400).json({
      error: "Rango inválido. Valores permitidos: 6m, 12m, 24m, 60m"
    });
  }

  // Validation: Interval must be valid
  const validIntervals = ["1d", "1wk", "1mo"];
  if (!validIntervals.includes(interval)) {
    return res.status(400).json({
      error: "Intervalo inválido. Valores permitidos: 1d, 1wk, 1mo"
    });
  }

  // Validation: 1d interval only allowed with 6m range or less
  if (interval === "1d" && range !== "6m") {
    return res.status(400).json({
      error: "El intervalo '1d' solo está disponible para rangos de 6m o menos"
    });
  }

  // Convert range to months
  const rangeToMonths = {
    "6m": 6,
    "12m": 12,
    "24m": 24,
    "60m": 60
  };
  const months = rangeToMonths[range];

  // Determine TTL based on interval
  const intervalToTTL = {
    "1mo": 3600,  // 1 hour
    "1wk": 1800,  // 30 minutes
    "1d": 900     // 15 minutes
  };
  const ttl = intervalToTTL[interval];

  try {
    // Call service layer
    const result = await getAssetHistoryService(symbol, months, interval, ttl);

    // Return success response
    return res.json(result);

  } catch (error) {
    console.error(`Error in getAssetHistory controller for ${symbol}:`, error);

    // Map service errors to HTTP status codes
    if (error.message === 'SYMBOL_NOT_FOUND') {
      return res.status(404).json({
        error: "Símbolo no encontrado o sin datos históricos disponibles"
      });
    }

    if (error.message === 'SERVICE_UNAVAILABLE') {
      return res.status(503).json({
        error: "Servicio de datos de mercado temporalmente no disponible"
      });
    }

    // Generic error
    return res.status(500).json({
      error: "Error obteniendo datos históricos del activo"
    });
  }
};
