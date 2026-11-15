-- Add real reactions to published confession comments while preserving existing discussion data.
CREATE TABLE "ConfessionCommentReaction" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "profileId" TEXT,
    "actorHash" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfessionCommentReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConfessionCommentReaction_commentId_actorHash_emoji_key"
  ON "ConfessionCommentReaction"("commentId", "actorHash", "emoji");
CREATE INDEX "ConfessionCommentReaction_commentId_emoji_idx"
  ON "ConfessionCommentReaction"("commentId", "emoji");

ALTER TABLE "ConfessionCommentReaction"
  ADD CONSTRAINT "ConfessionCommentReaction_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "ConfessionComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConfessionCommentReaction"
  ADD CONSTRAINT "ConfessionCommentReaction_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "CommenterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
