-- Add soft deletion while preserving comment rows and reply trees.
ALTER TABLE "ConfessionComment" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "ConfessionComment_deletedAt_idx" ON "ConfessionComment"("deletedAt");
