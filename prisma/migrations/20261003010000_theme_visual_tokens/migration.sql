-- Phase 3: canonical visual token storage for isolated admin drafts
ALTER TABLE "Theme" ADD COLUMN "tokens" JSONB;
