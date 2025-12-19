import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Tabla users
const createUsersTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    base_currency TEXT NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT NOW()
  );
`;

// Tabla assets (catálogo de activos)
const createAssetsTableQuery = `
  CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    risk_level INTEGER,
    UNIQUE(symbol, asset_type)
  );
`;

// Tabla user_portfolio (posiciones por usuario)
const createUserPortfolioTableQuery = `
  CREATE TABLE IF NOT EXISTS user_portfolio (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    quantity NUMERIC(20, 8) NOT NULL,
    avg_buy_price NUMERIC(20, 8) NOT NULL,
    tae NUMERIC(5, 2),
    face_value NUMERIC(20, 2),
    coupon_rate NUMERIC(5, 2),
    coupon_frequency INTEGER,
    maturity_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, asset_id)
  );
`;

(async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Conectado a PostgreSQL");

    await client.query(createUsersTableQuery);
    console.log("✅ Tabla 'users' lista (creada o ya existente)");

    await client.query(createAssetsTableQuery);
    console.log("✅ Tabla 'assets' lista (creada o ya existente)");

    await client.query(createUserPortfolioTableQuery);
    console.log("✅ Tabla 'user_portfolio' lista (creada o ya existente)");

    client.release();
  } catch (err) {
    console.error("❌ Error inicializando la BD:", err.message);
  }
})();

export default pool;
