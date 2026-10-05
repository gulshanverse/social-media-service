CREATE TYPE "VibeIdentityStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');
CREATE TYPE "VibeProfileStatus" AS ENUM ('ACTIVE', 'PAUSED', 'HIDDEN', 'DELETED');
CREATE TYPE "VibeSessionStatus" AS ENUM ('PLAYING', 'COMPLETED', 'ABANDONED');

CREATE TABLE "VibeIdentity" (
  "id" TEXT NOT NULL,
  "emailHash" TEXT NOT NULL,
  "emailCiphertext" TEXT NOT NULL,
  "ageConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "status" "VibeIdentityStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VibeIdentity_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VibeIdentity_emailHash_key" ON "VibeIdentity"("emailHash");
CREATE INDEX "VibeIdentity_status_createdAt_idx" ON "VibeIdentity"("status", "createdAt");

CREATE TABLE "VibeIdentitySession" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  CONSTRAINT "VibeIdentitySession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VibeIdentitySession_tokenHash_key" ON "VibeIdentitySession"("tokenHash");
CREATE INDEX "VibeIdentitySession_identityId_expiresAt_idx" ON "VibeIdentitySession"("identityId", "expiresAt");
CREATE INDEX "VibeIdentitySession_expiresAt_idx" ON "VibeIdentitySession"("expiresAt");
CREATE INDEX "VibeIdentitySession_revokedAt_idx" ON "VibeIdentitySession"("revokedAt");

CREATE TABLE "VibeMagicLink" (
  "id" TEXT NOT NULL,
  "identityId" TEXT,
  "emailHash" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VibeMagicLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VibeMagicLink_tokenHash_key" ON "VibeMagicLink"("tokenHash");
CREATE INDEX "VibeMagicLink_emailHash_createdAt_idx" ON "VibeMagicLink"("emailHash", "createdAt");
CREATE INDEX "VibeMagicLink_expiresAt_idx" ON "VibeMagicLink"("expiresAt");

CREATE TABLE "VibeCollege" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VibeCollege_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VibeCollege_slug_key" ON "VibeCollege"("slug");
CREATE INDEX "VibeCollege_active_name_idx" ON "VibeCollege"("active", "name");
INSERT INTO "VibeCollege" ("id", "slug", "name", "updatedAt") VALUES
  ('vibe-college-generic', 'campus-community', 'Campus community', CURRENT_TIMESTAMP);

CREATE TABLE "VibeProfile" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "instagramUsername" TEXT,
  "collegeId" TEXT NOT NULL,
  "primaryIntent" TEXT NOT NULL,
  "secondaryIntent" TEXT,
  "interests" JSONB,
  "status" "VibeProfileStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VibeProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VibeProfile_identityId_key" ON "VibeProfile"("identityId");
CREATE INDEX "VibeProfile_collegeId_status_idx" ON "VibeProfile"("collegeId", "status");
CREATE INDEX "VibeProfile_status_updatedAt_idx" ON "VibeProfile"("status", "updatedAt");

CREATE TABLE "VibeSession" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "seed" INTEGER NOT NULL,
  "totalRounds" INTEGER NOT NULL,
  "currentRound" INTEGER NOT NULL DEFAULT 0,
  "questionIds" JSONB NOT NULL,
  "status" "VibeSessionStatus" NOT NULL DEFAULT 'PLAYING',
  "scoringVersion" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VibeSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VibeSession_profileId_status_updatedAt_idx" ON "VibeSession"("profileId", "status", "updatedAt");

CREATE TABLE "VibeSessionAnswer" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "round" INTEGER NOT NULL,
  "questionId" TEXT NOT NULL,
  "optionId" TEXT NOT NULL,
  "contribution" JSONB NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VibeSessionAnswer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VibeSessionAnswer_sessionId_questionId_key" ON "VibeSessionAnswer"("sessionId", "questionId");
CREATE UNIQUE INDEX "VibeSessionAnswer_sessionId_idempotencyKey_key" ON "VibeSessionAnswer"("sessionId", "idempotencyKey");
CREATE INDEX "VibeSessionAnswer_sessionId_round_idx" ON "VibeSessionAnswer"("sessionId", "round");

CREATE TABLE "VibeDnaSnapshot" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "scoringVersion" TEXT NOT NULL,
  "socialEnergy" INTEGER NOT NULL,
  "adventure" INTEGER NOT NULL,
  "spontaneity" INTEGER NOT NULL,
  "humor" INTEGER NOT NULL,
  "communication" INTEGER NOT NULL,
  "intent" INTEGER NOT NULL,
  "coverage" INTEGER NOT NULL,
  "answerCount" INTEGER NOT NULL,
  "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VibeDnaSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VibeDnaSnapshot_sessionId_calculatedAt_idx" ON "VibeDnaSnapshot"("sessionId", "calculatedAt");

ALTER TABLE "VibeIdentitySession" ADD CONSTRAINT "VibeIdentitySession_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "VibeIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VibeMagicLink" ADD CONSTRAINT "VibeMagicLink_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "VibeIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VibeProfile" ADD CONSTRAINT "VibeProfile_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "VibeIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VibeProfile" ADD CONSTRAINT "VibeProfile_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "VibeCollege"("id") ON UPDATE CASCADE;
ALTER TABLE "VibeSession" ADD CONSTRAINT "VibeSession_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "VibeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VibeSessionAnswer" ADD CONSTRAINT "VibeSessionAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VibeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VibeDnaSnapshot" ADD CONSTRAINT "VibeDnaSnapshot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VibeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
