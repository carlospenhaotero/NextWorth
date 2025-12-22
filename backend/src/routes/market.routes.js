// src/routes/market.routes.js

import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { getQuote } from "../services/marketDataService.js";
import { getAssetHistory } from "../controllers/marketController.js";

const router = Router();

// GET /api/market/quote/AAPL
router.get("/quote/:symbol", authRequired, async (req, res) => {
  const { symbol } = req.params;

  if (!symbol) {
    return res.status(400).json({ error: "Symbol es obligatorio" });
  }

  try {
    const quote = await getQuote(symbol.toUpperCase());
    return res.json(quote);
  } catch (err) {
    console.error("Error en /api/market/quote:", err.message);
    return res.status(500).json({ error: "Error obteniendo la cotización" });
  }
});

import { getFxRate } from "../services/marketDataService.js";

// ...

// GET /api/market/fx/USD/EUR
router.get("/fx/:from/:to", authRequired, async (req, res) => {
  const { from, to } = req.params;

  try {
    const rate = await getFxRate(from, to);
    return res.json({ from, to, rate });
  } catch (err) {
    console.error("Error en /api/market/fx:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/market/history/AAPL?range=24m&interval=1mo
router.get("/history/:symbol", authRequired, getAssetHistory);

export default router;
