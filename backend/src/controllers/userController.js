// src/controllers/userController.js

import pool from "../config/db.js";

// PATCH /api/user/settings
export const updateUserSettings = async (req, res) => {
  const userId = req.user?.userId; // viene del JWT (authRequired)

  if (!userId) {
    return res.status(401).json({ error: "Usuario no autenticado" });
  }

  // Aceptamos baseCurrency o base_currency en el body
  const { baseCurrency, base_currency } = req.body;
  const newBaseCurrency = (baseCurrency || base_currency || "").toUpperCase();

  // Lista simple de monedas permitidas (puedes ampliar luego)
  const allowedCurrencies = ["USD", "EUR", "GBP"];

  if (!allowedCurrencies.includes(newBaseCurrency)) {
    return res.status(400).json({
      error: `baseCurrency inválido. Valores permitidos: ${allowedCurrencies.join(
        ", "
      )}`,
    });
  }

  try {
    const query = `
      UPDATE users
      SET base_currency = $1
      WHERE id = $2
      RETURNING id, name, email, base_currency, created_at;
    `;

    const result = await pool.query(query, [newBaseCurrency, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const user = result.rows[0];

    return res.json({
      message: "Ajustes actualizados correctamente",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        baseCurrency: user.base_currency,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error("Error en updateUserSettings:", err);
    return res
      .status(500)
      .json({ error: "Error al actualizar los ajustes del usuario" });
  }
};
