CREATE TABLE "VibeGuestSession" (
  "id" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "instagramUsername" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  CONSTRAINT "VibeGuestSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VibeGuestSession_tokenHash_key" ON "VibeGuestSession"("tokenHash");
CREATE INDEX "VibeGuestSession_expiresAt_idx" ON "VibeGuestSession"("expiresAt");
CREATE INDEX "VibeGuestSession_revokedAt_idx" ON "VibeGuestSession"("revokedAt");

ALTER TABLE "VibeSession" ALTER COLUMN "profileId" DROP NOT NULL;
ALTER TABLE "VibeSession" ADD COLUMN "guestSessionId" TEXT;
CREATE INDEX "VibeSession_guestSessionId_status_updatedAt_idx" ON "VibeSession"("guestSessionId", "status", "updatedAt");
ALTER TABLE "VibeSession" ADD CONSTRAINT "VibeSession_owner_check" CHECK (("profileId" IS NOT NULL AND "guestSessionId" IS NULL) OR ("profileId" IS NULL AND "guestSessionId" IS NOT NULL));
ALTER TABLE "VibeGuestSession" ADD CONSTRAINT "VibeGuestSession_tokenHash_format_check" CHECK ("tokenHash" ~ '^[0-9a-f]{64}$');
ALTER TABLE "VibeSession" ADD CONSTRAINT "VibeSession_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "VibeGuestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
