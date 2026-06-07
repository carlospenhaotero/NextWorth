-- Make avg_buy_price optional so positions can be tracked without a known cost basis.
ALTER TABLE "user_portfolio" ALTER COLUMN "avg_buy_price" DROP NOT NULL;
