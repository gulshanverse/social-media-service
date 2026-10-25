-- The previous key allowed only one reaction per actor and confession.
-- Its uniqueness guarantees that existing rows cannot conflict with the new key.
DROP INDEX "ConfessionReaction_confessionId_actorHash_key";
CREATE UNIQUE INDEX "ConfessionReaction_confessionId_actorHash_emoji_key"
  ON "ConfessionReaction"("confessionId", "actorHash", "emoji");
