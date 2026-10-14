-- Additive Garba card theme selection. NULL preserves historical posts and resolves to the catalog default.
ALTER TABLE "GarbaPost" ADD COLUMN "themeId" TEXT;
CREATE INDEX "GarbaPost_themeId_idx" ON "GarbaPost"("themeId");
