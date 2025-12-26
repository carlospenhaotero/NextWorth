// src/routes/prediction.routes.js
// Routes for price predictions

import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { getPrediction } from '../controllers/predictionController.js';

const router = express.Router();

/**
 * GET /api/predictions/:symbol?horizon=6m
 * Get price predictions for an asset
 * Requires authentication
 */
router.get('/:symbol', authRequired, getPrediction);

export default router;
