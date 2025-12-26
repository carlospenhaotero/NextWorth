// src/controllers/predictionController.js
// Controller for asset price predictions

import pool from "../config/db.js";
import * as predictionService from "../services/predictionService.js";

/**
 * GET /api/predictions/:symbol?horizon=6m
 * Get price predictions for an asset
 */
export async function getPrediction(req, res) {
  try {
    const { symbol } = req.params;
    const { horizon = '6m' } = req.query;

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    // Validate horizon parameter
    const validHorizons = ['3m', '6m', '1y', '2y', '5y'];
    if (!validHorizons.includes(horizon)) {
      return res.status(400).json({
        error: `Invalid horizon. Must be one of: ${validHorizons.join(', ')}`
      });
    }

    // Determine TTL based on horizon
    // Short-term predictions (3m, 6m): 1 hour = 3600s
    // Long-term predictions (1y, 2y, 5y): 24 hours = 86400s
    const ttl = ['3m', '6m'].includes(horizon) ? 3600 : 86400;

    console.log(`📊 Prediction request: ${symbol}, horizon: ${horizon}, TTL: ${ttl}s`);

    // Get or create asset in database
    const symbolUpper = symbol.toUpperCase();
    const assetType = inferAssetType(symbolUpper);

    const assetQuery = `
      INSERT INTO assets (symbol, name, asset_type, currency)
      VALUES ($1, $1, $2, 'USD')
      ON CONFLICT (symbol, asset_type)
      DO UPDATE SET symbol = EXCLUDED.symbol
      RETURNING id, symbol, name, asset_type, currency;
    `;

    const assetResult = await pool.query(assetQuery, [symbolUpper, assetType]);
    const asset = assetResult.rows[0];

    // Get predictions from service
    const result = await predictionService.getAssetPrediction(
      asset.id,
      symbolUpper,
      horizon,
      ttl
    );

    if (!result) {
      return res.status(503).json({
        error: 'Predictions temporarily unavailable. Please try again later.'
      });
    }

    return res.json(result);

  } catch (error) {
    console.error('Prediction controller error:', error);
    return res.status(500).json({
      error: 'Failed to generate predictions',
      message: error.message
    });
  }
}

/**
 * Infer asset type from symbol format
 * @private
 */
function inferAssetType(symbol) {
  const upper = symbol.toUpperCase();
  if (upper.includes('-USD')) return 'crypto';
  if (upper.includes('=F')) return 'commodities';
  if (upper.includes('=X')) return 'currency';
  return 'stocks';
}
