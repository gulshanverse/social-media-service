ALTER TABLE "HomepagePromotion"
  ALTER COLUMN "desktopImageUrl" DROP NOT NULL,
  ALTER COLUMN "desktopImageKey" DROP NOT NULL,
  ADD COLUMN "backgroundPreset" TEXT NOT NULL DEFAULT 'aurora';
