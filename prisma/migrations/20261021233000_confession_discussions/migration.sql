-- Additive migration: confession commenter identities, moderated comments, and reactions.
CREATE TYPE "ConfessionCommentStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED', 'ARCHIVED', 'LOCKED');

ALTER TABLE "Confession" ADD COLUMN "commentsLocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Report" ADD COLUMN "commentId" TEXT;

CREATE TABLE "CommenterProfile" (
  "id" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "instagramUsername" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommenterProfile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CommenterProfile_instagramUsername_idx" ON "CommenterProfile"("instagramUsername");

CREATE TABLE "CommenterSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  CONSTRAINT "CommenterSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CommenterSession_tokenHash_key" ON "CommenterSession"("tokenHash");
CREATE INDEX "CommenterSession_profileId_idx" ON "CommenterSession"("profileId");
CREATE INDEX "CommenterSession_expiresAt_revokedAt_idx" ON "CommenterSession"("expiresAt", "revokedAt");
ALTER TABLE "CommenterSession" ADD CONSTRAINT "CommenterSession_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CommenterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ConfessionComment" (
  "id" TEXT NOT NULL,
  "confessionId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "parentId" TEXT,
  "content" TEXT NOT NULL,
  "status" "ConfessionCommentStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConfessionComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ConfessionComment_confessionId_status_parentId_createdAt_idx" ON "ConfessionComment"("confessionId", "status", "parentId", "createdAt");
CREATE INDEX "ConfessionComment_parentId_status_createdAt_idx" ON "ConfessionComment"("parentId", "status", "createdAt");
CREATE INDEX "ConfessionComment_profileId_createdAt_idx" ON "ConfessionComment"("profileId", "createdAt");
ALTER TABLE "ConfessionComment" ADD CONSTRAINT "ConfessionComment_confessionId_fkey" FOREIGN KEY ("confessionId") REFERENCES "Confession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConfessionComment" ADD CONSTRAINT "ConfessionComment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CommenterProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConfessionComment" ADD CONSTRAINT "ConfessionComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ConfessionComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ConfessionReaction" (
  "id" TEXT NOT NULL,
  "confessionId" TEXT NOT NULL,
  "profileId" TEXT,
  "actorHash" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConfessionReaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ConfessionReaction_confessionId_actorHash_key" ON "ConfessionReaction"("confessionId", "actorHash");
CREATE INDEX "ConfessionReaction_confessionId_emoji_idx" ON "ConfessionReaction"("confessionId", "emoji");
ALTER TABLE "ConfessionReaction" ADD CONSTRAINT "ConfessionReaction_confessionId_fkey" FOREIGN KEY ("confessionId") REFERENCES "Confession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConfessionReaction" ADD CONSTRAINT "ConfessionReaction_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CommenterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ConfessionComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Report_commentId_idx" ON "Report"("commentId");
