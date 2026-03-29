-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "base_currency" TEXT NOT NULL DEFAULT 'USD',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "risk_level" INTEGER,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_portfolio" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "quantity" DECIMAL(20,8) NOT NULL,
    "avg_buy_price" DECIMAL(20,8) NOT NULL,
    "tae" DECIMAL(5,2),
    "face_value" DECIMAL(20,2),
    "coupon_rate" DECIMAL(5,2),
    "coupon_frequency" INTEGER,
    "maturity_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_price_history" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "month" DATE NOT NULL,
    "open" DECIMAL(20,8) NOT NULL,
    "high" DECIMAL(20,8) NOT NULL,
    "low" DECIMAL(20,8) NOT NULL,
    "close" DECIMAL(20,8) NOT NULL,
    "volume" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "fetched_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_predictions" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "prediction_horizon" TEXT NOT NULL,
    "prediction_date" DATE NOT NULL,
    "predicted_close" DECIMAL(20,8) NOT NULL,
    "confidence_low" DECIMAL(20,8),
    "confidence_high" DECIMAL(20,8),
    "model_version" TEXT NOT NULL DEFAULT 'chronos-t5-small',
    "fetched_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "assets_symbol_asset_type_key" ON "assets"("symbol", "asset_type");

-- CreateIndex
CREATE UNIQUE INDEX "user_portfolio_user_id_asset_id_key" ON "user_portfolio"("user_id", "asset_id");

-- CreateIndex
CREATE INDEX "asset_price_history_asset_id_month_idx" ON "asset_price_history"("asset_id", "month" DESC);

-- CreateIndex
CREATE INDEX "asset_price_history_fetched_at_idx" ON "asset_price_history"("fetched_at");

-- CreateIndex
CREATE INDEX "asset_price_history_asset_id_fetched_at_idx" ON "asset_price_history"("asset_id", "fetched_at");

-- CreateIndex
CREATE UNIQUE INDEX "asset_price_history_asset_id_month_key" ON "asset_price_history"("asset_id", "month");

-- CreateIndex
CREATE INDEX "asset_predictions_asset_id_prediction_horizon_fetched_at_idx" ON "asset_predictions"("asset_id", "prediction_horizon", "fetched_at" DESC);

-- CreateIndex
CREATE INDEX "asset_predictions_fetched_at_idx" ON "asset_predictions"("fetched_at");

-- CreateIndex
CREATE UNIQUE INDEX "asset_predictions_asset_id_prediction_horizon_prediction_da_key" ON "asset_predictions"("asset_id", "prediction_horizon", "prediction_date");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_portfolio" ADD CONSTRAINT "user_portfolio_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_portfolio" ADD CONSTRAINT "user_portfolio_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_price_history" ADD CONSTRAINT "asset_price_history_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_predictions" ADD CONSTRAINT "asset_predictions_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
