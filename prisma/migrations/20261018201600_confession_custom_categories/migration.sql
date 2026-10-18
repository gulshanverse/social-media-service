-- Additive migration: preserve existing OTHER rows and all confession data.
ALTER TYPE "ConfessionCategory" ADD VALUE IF NOT EXISTS 'ADMIRATION';
ALTER TYPE "ConfessionCategory" ADD VALUE IF NOT EXISTS 'CUSTOM';

ALTER TABLE "Confession" ADD COLUMN "customCategory" TEXT;
CREATE INDEX IF NOT EXISTS "Confession_category_idx" ON "Confession"("category");
