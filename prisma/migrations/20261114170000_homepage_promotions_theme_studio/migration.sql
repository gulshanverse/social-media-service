ALTER TABLE "HomepagePromotion"
  ADD COLUMN "themeId" TEXT,
  ADD COLUMN "layoutSettings" JSONB;

CREATE INDEX "HomepagePromotion_themeId_idx" ON "HomepagePromotion"("themeId");

ALTER TABLE "HomepagePromotion"
  ADD CONSTRAINT "HomepagePromotion_themeId_fkey"
  FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
