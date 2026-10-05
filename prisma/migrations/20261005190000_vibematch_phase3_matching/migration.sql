ALTER TABLE "VibeProfile" ADD COLUMN "discoveryKey" TEXT;
UPDATE "VibeProfile" SET "discoveryKey" = gen_random_uuid()::text WHERE "discoveryKey" IS NULL;
ALTER TABLE "VibeProfile" ALTER COLUMN "discoveryKey" SET NOT NULL;
CREATE UNIQUE INDEX "VibeProfile_discoveryKey_key" ON "VibeProfile"("discoveryKey");

CREATE TABLE "VibeBlock" (
    "id" TEXT NOT NULL,
    "blockerIdentityId" TEXT NOT NULL,
    "blockedIdentityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VibeBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VibeBlock_blockerIdentityId_blockedIdentityId_key" ON "VibeBlock"("blockerIdentityId", "blockedIdentityId");
CREATE INDEX "VibeBlock_blockedIdentityId_blockerIdentityId_idx" ON "VibeBlock"("blockedIdentityId", "blockerIdentityId");

ALTER TABLE "VibeBlock" ADD CONSTRAINT "VibeBlock_blockerIdentityId_fkey" FOREIGN KEY ("blockerIdentityId") REFERENCES "VibeIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VibeBlock" ADD CONSTRAINT "VibeBlock_blockedIdentityId_fkey" FOREIGN KEY ("blockedIdentityId") REFERENCES "VibeIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
