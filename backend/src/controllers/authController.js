// src/controllers/authController.js

import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/* ============================================================
   REGISTER
   ============================================================ */
export const register = async (req, res) => {
  const { name, email, password } = req.body;

  // Validaciones básicas
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  try {
    // Verificar si el email ya existe
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "El email ya está registrado" });
    }

    // Hashear contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Insertar usuario con base_currency incluida
    const insertQuery = `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, base_currency, created_at;
    `;

    const result = await pool.query(insertQuery, [
      name,
      email,
      passwordHash,
    ]);

    const newUser = result.rows[0];

    // Crear token JWT
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Respuesta final
    return res.status(201).json({
      message: "Usuario registrado correctamente",
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        baseCurrency: newUser.base_currency,
        createdAt: newUser.created_at,
      },
    });
  } catch (err) {
    console.error("Error en register:", err);
    return res.status(500).json({ error: "Error al registrar usuario" });
  }
};

/* ============================================================
   LOGIN
   ============================================================ */
export const login = async (req, res) => {
  const { email, password } = req.body;

  // Validación mínima
  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña obligatorios" });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Credenciales inválidas" });
    }

    const user = result.rows[0];

    // Comparar la contraseña
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Credenciales inválidas" });
    }

    // Crear token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({
      message: "Login correcto",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        baseCurrency: user.base_currency, // 👈 importante para ajustes
      },
    });
  } catch (err) {
    console.error("Error en login:", err);
    return res.status(500).json({ error: "Error al iniciar sesión" });
  }
};

/* ============================================================
   PROFILE (/me)
   ============================================================ */
export const profile = async (req, res) => {
  try {
    const { userId } = req.user;

    const result = await pool.query(
      "SELECT id, name, email, base_currency, created_at FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const user = result.rows[0];

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      baseCurrency: user.base_currency,
      createdAt: user.created_at,
    });
  } catch (err) {
    console.error("Error en profile:", err);
    return res.status(500).json({ error: "Error al obtener perfil" });
  }
};
