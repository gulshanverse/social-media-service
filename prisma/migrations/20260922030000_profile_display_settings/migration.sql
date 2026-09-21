ALTER TABLE "CollegeConfessionProfileSettings"
  ADD COLUMN "maxCharacters" INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN "cardTextSize" INTEGER NOT NULL DEFAULT 16,
  ADD COLUMN "previewLines" INTEGER NOT NULL DEFAULT 5;

ALTER TABLE "CollegeConfessionProfileSettings"
  ADD CONSTRAINT "CollegeConfessionProfileSettings_maxCharacters_check" CHECK ("maxCharacters" BETWEEN 100 AND 5000),
  ADD CONSTRAINT "CollegeConfessionProfileSettings_cardTextSize_check" CHECK ("cardTextSize" BETWEEN 14 AND 20),
  ADD CONSTRAINT "CollegeConfessionProfileSettings_previewLines_check" CHECK ("previewLines" BETWEEN 3 AND 6);
