CREATE TABLE "CollegeConfessionProfileSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "handle" TEXT NOT NULL DEFAULT '@college.confession.ggv',
    "headerMessage" TEXT NOT NULL DEFAULT 'send me anonymous weekly Confession!',
    "defaultPrompt" TEXT NOT NULL DEFAULT 'Are u talking to anyone??',
    "communityButtonText" TEXT NOT NULL DEFAULT 'Visit Community',
    "communityPath" TEXT NOT NULL DEFAULT '/confessions',
    "bottomButtonText" TEXT NOT NULL DEFAULT 'Get your own messages!',
    "profileImageUrl" TEXT,
    "themePreset" TEXT NOT NULL DEFAULT 'sunset',
    "prompts" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    CONSTRAINT "CollegeConfessionProfileSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "CollegeConfessionProfileSettings" ("id", "prompts", "updatedAt")
VALUES (
  'default',
  '["Are u talking to anyone??", "Who is your current college crush?", "What is something you have never told anyone?", "What is your biggest college secret?", "Who do you secretly want to talk to?", "What is your funniest college memory?"]'::jsonb,
  CURRENT_TIMESTAMP
);
