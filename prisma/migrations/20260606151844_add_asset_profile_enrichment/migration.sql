-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "country" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "profile_fetched_at" TIMESTAMPTZ,
ADD COLUMN     "profile_status" TEXT,
ADD COLUMN     "sector" TEXT,
ADD COLUMN     "sector_weightings" JSONB;
