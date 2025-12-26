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

// Tabla asset_price_history (histórico de precios mensuales)
const createAssetPriceHistoryTableQuery = `
  CREATE TABLE IF NOT EXISTS asset_price_history (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    open NUMERIC(20, 8) NOT NULL,
    high NUMERIC(20, 8) NOT NULL,
    low NUMERIC(20, 8) NOT NULL,
    close NUMERIC(20, 8) NOT NULL,
    volume BIGINT NOT NULL DEFAULT 0,
    currency TEXT NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT asset_price_history_asset_month_uq UNIQUE (asset_id, month),
    CONSTRAINT asset_price_history_open_chk CHECK (open >= 0),
    CONSTRAINT asset_price_history_high_chk CHECK (high >= 0),
    CONSTRAINT asset_price_history_low_chk CHECK (low >= 0),
    CONSTRAINT asset_price_history_close_chk CHECK (close >= 0),
    CONSTRAINT asset_price_history_volume_chk CHECK (volume >= 0),
    CONSTRAINT asset_price_history_currency_chk CHECK (currency IN ('USD', 'EUR')),
    CONSTRAINT asset_price_history_ohlc_chk CHECK (
      low <= high AND
      open >= low AND open <= high AND
      close >= low AND close <= high
    )
  );
`;

// Índices para asset_price_history
const createAssetPriceHistoryIndexesQuery = `
  CREATE INDEX IF NOT EXISTS idx_asset_price_history_asset_month
    ON asset_price_history(asset_id, month DESC);

  CREATE INDEX IF NOT EXISTS idx_asset_price_history_fetched
    ON asset_price_history(fetched_at);

  CREATE INDEX IF NOT EXISTS idx_asset_price_history_asset_fetched
    ON asset_price_history(asset_id, fetched_at);
`;

// Tabla asset_predictions (predicciones de precios con IA)
const createAssetPredictionsTableQuery = `
  CREATE TABLE IF NOT EXISTS asset_predictions (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    prediction_horizon TEXT NOT NULL,
    prediction_date DATE NOT NULL,
    predicted_close NUMERIC(20, 8) NOT NULL,
    confidence_low NUMERIC(20, 8),
    confidence_high NUMERIC(20, 8),
    model_version TEXT NOT NULL DEFAULT 'chronos-t5-small',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT asset_predictions_uq UNIQUE (asset_id, prediction_horizon, prediction_date),
    CONSTRAINT asset_predictions_close_chk CHECK (predicted_close >= 0),
    CONSTRAINT asset_predictions_horizon_chk CHECK (
      prediction_horizon IN ('3m', '6m', '1y', '2y', '5y')
    )
  );
`;

// Índices para asset_predictions
const createAssetPredictionsIndexesQuery = `
  CREATE INDEX IF NOT EXISTS idx_asset_predictions_lookup
    ON asset_predictions(asset_id, prediction_horizon, fetched_at DESC);

  CREATE INDEX IF NOT EXISTS idx_asset_predictions_ttl
    ON asset_predictions(fetched_at);
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

    await client.query(createAssetPriceHistoryTableQuery);
    console.log("✅ Tabla 'asset_price_history' lista (creada o ya existente)");

    await client.query(createAssetPriceHistoryIndexesQuery);
    console.log("✅ Índices para 'asset_price_history' listos");

    await client.query(createAssetPredictionsTableQuery);
    console.log("✅ Tabla 'asset_predictions' lista (creada o ya existente)");

    await client.query(createAssetPredictionsIndexesQuery);
    console.log("✅ Índices para 'asset_predictions' listos");

    client.release();
  } catch (err) {
    console.error("❌ Error inicializando la BD:", err.message);
  }
})();

export default pool;
