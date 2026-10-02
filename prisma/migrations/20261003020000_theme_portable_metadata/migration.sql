-- Phase 4A: portable theme metadata for versioned import/export
ALTER TABLE "Theme" ADD COLUMN "description" TEXT;
ALTER TABLE "Theme" ADD COLUMN "icon" TEXT;
ALTER TABLE "Theme" ADD COLUMN "category" TEXT;
ALTER TABLE "Theme" ADD COLUMN "tags" JSONB;
