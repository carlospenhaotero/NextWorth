// src/controllers/portfolioController.js

import pool from "../config/db.js";
import { getQuote, getFxRate } from "../services/marketDataService.js";

/* ============================================================
   POST /api/portfolio
   Crea o actualiza una posición del usuario
   ============================================================ */
export const upsertPosition = async (req, res) => {
  const userId = req.user?.userId; // viene del JWT
  const {
    symbol,
    name,
    assetType,
    currency = "USD",
    quantity,
    avgBuyPrice,
    tae,
    faceValue,
    couponRate,
    couponFrequency,
    maturityDate,
  } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "Usuario no autenticado" });
  }

  if (!symbol || !assetType || !quantity || !avgBuyPrice) {
    return res.status(400).json({
      error:
        "symbol, assetType, quantity y avgBuyPrice son obligatorios (name y currency son recomendados)",
    });
  }

  try {
    // 1) Asegurar asset
    const insertAssetQuery = `
      INSERT INTO assets (symbol, name, asset_type, currency)
      VALUES ($1, COALESCE($2, $1), $3, $4)
      ON CONFLICT (symbol, asset_type)
      DO UPDATE SET
        name = COALESCE(EXCLUDED.name, assets.name),
        currency = EXCLUDED.currency
      RETURNING id, symbol, name, asset_type, currency;
    `;

    const assetResult = await pool.query(insertAssetQuery, [
      symbol.toUpperCase(),
      name,
      assetType,
      currency.toUpperCase(),
    ]);

    const asset = assetResult.rows[0];

    // 2) Upsert de la posición
    const upsertPortfolioQuery = `
      INSERT INTO user_portfolio (user_id, asset_id, quantity, avg_buy_price, tae, face_value, coupon_rate, coupon_frequency, maturity_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id, asset_id)
      DO UPDATE SET
        quantity = EXCLUDED.quantity,
        avg_buy_price = EXCLUDED.avg_buy_price,
        tae = EXCLUDED.tae,
        face_value = EXCLUDED.face_value,
        coupon_rate = EXCLUDED.coupon_rate,
        coupon_frequency = EXCLUDED.coupon_frequency,
        maturity_date = EXCLUDED.maturity_date,
        updated_at = NOW()
      RETURNING id, user_id, asset_id, quantity, avg_buy_price, tae, face_value, coupon_rate, coupon_frequency, maturity_date, created_at, updated_at;
    `;

    const portfolioResult = await pool.query(upsertPortfolioQuery, [
      userId,
      asset.id,
      quantity,
      avgBuyPrice,
      tae || null,
      faceValue || null,
      couponRate || null,
      couponFrequency || null,
      maturityDate || null,
    ]);

    const position = portfolioResult.rows[0];

    return res.status(201).json({
      message: "Posición guardada correctamente",
      asset,
      position,
    });
  } catch (err) {
    console.error("Error en upsertPosition:", err);
    return res.status(500).json({
      error: err.message || "Error al guardar la posición en el portfolio",
    });
  }
};

/* ============================================================
   GET /api/portfolio
   Devuelve el portfolio del usuario en su moneda base
   ============================================================ */
export const getPortfolio = async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Usuario no autenticado" });
  }

  try {
    // 0) moneda base del usuario
    const userResult = await pool.query(
      "SELECT base_currency FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const baseCurrency = userResult.rows[0].base_currency.toUpperCase();

    // 1) posiciones + assets
    const query = `
      SELECT
        up.id,
        a.symbol,
        a.name,
        a.asset_type,
        a.currency,
        up.quantity,
        up.avg_buy_price,
        up.tae,
        up.face_value,
        up.coupon_rate,
        up.coupon_frequency,
        up.maturity_date,
        up.created_at,
        up.updated_at
      FROM user_portfolio up
      JOIN assets a ON up.asset_id = a.id
      WHERE up.user_id = $1
      ORDER BY a.symbol;
    `;

    const result = await pool.query(query, [userId]);
    const rows = result.rows;

    if (rows.length === 0) {
      return res.json({
        baseCurrency,
        totalCurrentValue: 0,
        totalInvested: 0,
        totalProfitLoss: 0,
        positions: [],
      });
    }

    // caché simples de FX
    const fxCache = {};

    async function getRateCached(fromCurrency, toCurrency) {
      const from = fromCurrency.toUpperCase();
      const to = toCurrency.toUpperCase();
      if (from === to) return 1;

      const key = `${from}_${to}`;
      if (fxCache[key]) return fxCache[key];

      const rate = await getFxRate(from, to);
      fxCache[key] = rate;
      return rate;
    }

    // 2) Construir posiciones con precios y FX (Secuencial para evitar timeouts)
    const positionsWithPrice = [];

    for (const row of rows) {
      const symbol = row.symbol;
      const assetCurrency = row.currency.toUpperCase();

      let currentPriceNative = null;
      let errorMsg = null;

      let priceEstimated = false;

      try {
        if (['cash', 'savings'].includes(row.asset_type)) {
          // Para efectivo, el precio unitario es siempre 1 en su propia moneda
          currentPriceNative = 1;
        } else {
          // Llamada a API externa (puede fallar)
          const quote = await getQuote(symbol);
          currentPriceNative = quote.currentPrice ?? null;
        }
      } catch (err) {
        console.error(`Error obteniendo precio para ${symbol}:`, err.message);
        // Fallback: usar precio de compra como estimación
        currentPriceNative = Number(row.avg_buy_price);
        priceEstimated = true;
        errorMsg = "Precio no disponible en tiempo real, usando precio de compra";
      }

      // Tipo de cambio activo → base (ej: USD→EUR)
      // Si falla el FX, también lo capturamos para no romper todo
      let fxRate = 1;
      try {
        fxRate = await getRateCached(assetCurrency, baseCurrency);
      } catch (err) {
        console.error(`Error obteniendo FX ${assetCurrency}->${baseCurrency}:`, err.message);
        // Si falla FX, no podemos calcular valor en moneda base correctamente
        // Podríamos dejar fxRate = 1 pero sería incorrecto si las monedas son distintas.
        // Lo dejamos en 1 o null? Mejor null para indicar error en cálculos
        if (assetCurrency !== baseCurrency) {
          fxRate = null;
          errorMsg = errorMsg || "Error obteniendo tipo de cambio";
        }
      }

      const quantity = Number(row.quantity);
      const avgBuyPrice = Number(row.avg_buy_price);

      // Invertido en moneda del activo
      const investedNative = quantity * avgBuyPrice;

      // Convertimos a moneda base (si tenemos fxRate)
      let investedBase = null;
      if (fxRate !== null) {
        investedBase = investedNative * fxRate;
      }

      let currentPriceBase = null;
      let currentValueBase = null;
      let profitLoss = null;
      let profitLossPct = null;

      if (currentPriceNative != null && fxRate != null) {
        const currentValueNative = quantity * currentPriceNative;
        currentPriceBase = currentPriceNative * fxRate;
        currentValueBase = currentValueNative * fxRate;

        if (investedBase !== null) {
          profitLoss = currentValueBase - investedBase;
          profitLossPct = investedBase !== 0 ? (profitLoss / investedBase) * 100 : 0;
        }
      }

      positionsWithPrice.push({
        id: row.id,
        symbol: row.symbol,
        name: row.name,
        assetType: row.asset_type,
        assetCurrency,
        baseCurrency,
        quantity,
        avgBuyPrice,      // en moneda del activo
        tae: row.tae,     // TAE para ahorros
        faceValue: row.face_value,
        couponRate: row.coupon_rate,
        couponFrequency: row.coupon_frequency,
        maturityDate: row.maturity_date,
        currentPrice: currentPriceBase, // en moneda base
        invested: investedBase,         // en moneda base
        currentValue: currentValueBase, // en moneda base
        profitLoss,
        profitLossPct,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        error: errorMsg, // opcional: devolver error al front si se quiere mostrar
        priceEstimated  // true si el precio no viene de API en tiempo real
      });
    }

    // 3) Totales
    const totals = positionsWithPrice.reduce(
      (acc, pos) => {
        if (pos.invested != null) acc.totalInvested += pos.invested;
        if (pos.currentValue != null) acc.totalCurrentValue += pos.currentValue;
        if (pos.profitLoss != null) acc.totalProfitLoss += pos.profitLoss;
        return acc;
      },
      { totalCurrentValue: 0, totalInvested: 0, totalProfitLoss: 0 }
    );

    return res.json({
      baseCurrency,
      ...totals,
      positions: positionsWithPrice,
    });
  } catch (err) {
    console.error("Error en getPortfolio:", err);
    return res.status(500).json({
      error: err.message || "Error al obtener el portfolio del usuario",
    });
  }
};

/* ============================================================
   DELETE /api/portfolio/:id
   Elimina una posición del portfolio
   ============================================================ */
export const deletePosition = async (req, res) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ error: "Usuario no autenticado" });
  }

  try {
    // Verificar que la posición pertenece al usuario antes de borrar
    const deleteQuery = `
      DELETE FROM user_portfolio
      WHERE id = $1 AND user_id = $2
      RETURNING id;
    `;

    const result = await pool.query(deleteQuery, [id, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Posición no encontrada o no autorizada" });
    }

    return res.json({ message: "Posición eliminada correctamente" });
  } catch (err) {
    console.error("Error en deletePosition:", err);
    return res.status(500).json({
      error: err.message || "Error al eliminar la posición",
    });
  }
};

/**
 * Actualizar solo el TAE de una posición existente (bond/savings)
 * PATCH /api/portfolio/:id/tae
 */
export const updateTae = async (req, res) => {
  const userId = req.user.userId;
  const positionId = req.params.id;
  const { tae } = req.body;

  // Validación
  if (tae === undefined || tae === null) {
    return res.status(400).json({ error: 'TAE is required' });
  }

  const numTae = parseFloat(tae);
  if (isNaN(numTae) || numTae < 0 || numTae > 100) {
    return res.status(400).json({ error: 'TAE must be between 0 and 100' });
  }

  try {
    // Update solo el campo TAE
    const result = await pool.query(
      `UPDATE user_portfolio
       SET tae = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [numTae, positionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }

    res.json({
      message: 'TAE updated successfully',
      position: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating TAE:', err);
    res.status(500).json({ error: 'Failed to update TAE' });
  }
};
