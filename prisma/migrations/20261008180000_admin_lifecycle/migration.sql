ALTER TABLE "AdminUser" ADD COLUMN "bannedAt" TIMESTAMP(3);
ALTER TABLE "AdminUser" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "AdminUser_bannedAt_idx" ON "AdminUser"("bannedAt");
CREATE INDEX "AdminUser_deletedAt_idx" ON "AdminUser"("deletedAt");
