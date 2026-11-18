-- Repair the comment reaction schema if an earlier release recorded the migration without creating the table.
CREATE TABLE IF NOT EXISTS "ConfessionCommentReaction" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "profileId" TEXT,
    "actorHash" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfessionCommentReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ConfessionCommentReaction_commentId_actorHash_emoji_key"
  ON "ConfessionCommentReaction"("commentId", "actorHash", "emoji");
CREATE INDEX IF NOT EXISTS "ConfessionCommentReaction_commentId_emoji_idx"
  ON "ConfessionCommentReaction"("commentId", "emoji");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ConfessionCommentReaction_commentId_fkey'
  ) THEN
    ALTER TABLE "ConfessionCommentReaction"
      ADD CONSTRAINT "ConfessionCommentReaction_commentId_fkey"
      FOREIGN KEY ("commentId") REFERENCES "ConfessionComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ConfessionCommentReaction_profileId_fkey'
  ) THEN
    ALTER TABLE "ConfessionCommentReaction"
      ADD CONSTRAINT "ConfessionCommentReaction_profileId_fkey"
      FOREIGN KEY ("profileId") REFERENCES "CommenterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
