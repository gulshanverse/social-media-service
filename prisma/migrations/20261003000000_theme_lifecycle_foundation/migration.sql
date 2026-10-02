-- Phase 2: theme lifecycle, scheduling, and per-admin favorites
CREATE TYPE "ThemeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ACTIVE', 'SCHEDULED');

ALTER TABLE "Theme"
  ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'dark',
  ADD COLUMN "status" "ThemeStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "startAt" TIMESTAMP(3),
  ADD COLUMN "endAt" TIMESTAMP(3);

CREATE TABLE "ThemeFavorite" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "themeId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ThemeFavorite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ThemeFavorite_adminId_themeId_key" ON "ThemeFavorite"("adminId", "themeId");
CREATE INDEX "ThemeFavorite_adminId_createdAt_idx" ON "ThemeFavorite"("adminId", "createdAt");
CREATE INDEX "Theme_status_startAt_endAt_idx" ON "Theme"("status", "startAt", "endAt");
CREATE INDEX "Theme_mode_layoutVariant_idx" ON "Theme"("mode", "layoutVariant");

ALTER TABLE "ThemeFavorite" ADD CONSTRAINT "ThemeFavorite_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThemeFavorite" ADD CONSTRAINT "ThemeFavorite_themeId_fkey"
  FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
