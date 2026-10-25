CREATE TYPE "BawalBoxQuestionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED');
CREATE TYPE "BawalBoxResponseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED');

CREATE TABLE "BawalBoxSettings" (
  "id" TEXT NOT NULL DEFAULT 'default', "brandName" TEXT NOT NULL DEFAULT 'BawalBox',
  "tagline" TEXT NOT NULL DEFAULT 'Sawaal ek, bawal anek!',
  "shortDescription" TEXT NOT NULL DEFAULT 'Anonymous campus questions, honest answers, and a little good-natured bawal.',
  "longDescription" TEXT NOT NULL DEFAULT 'Ask the question everyone is thinking and let your campus answer anonymously. Responses are reviewed before they appear.',
  "logoUrl" TEXT, "accentColor" TEXT NOT NULL DEFAULT '#ff2d75',
  "seoTitle" TEXT NOT NULL DEFAULT 'BawalBox — Anonymous campus questions',
  "seoDescription" TEXT NOT NULL DEFAULT 'Ask, answer, and discover the questions shaping campus life.',
  "socialTitle" TEXT NOT NULL DEFAULT 'BawalBox — Sawaal ek, bawal anek!',
  "socialDescription" TEXT NOT NULL DEFAULT 'Anonymous campus questions and community answers.', "socialImageUrl" TEXT,
  "homepageTeaserTitle" TEXT NOT NULL DEFAULT 'Ask the question everyone is thinking.',
  "homepageTeaserDescription" TEXT NOT NULL DEFAULT 'BawalBox is now open for anonymous campus questions.',
  "homepageTeaserCta" TEXT NOT NULL DEFAULT 'Open BawalBox', "navLabel" TEXT NOT NULL DEFAULT 'BawalBox',
  "navVisible" BOOLEAN NOT NULL DEFAULT true, "teaserVisible" BOOLEAN NOT NULL DEFAULT true,
  "introTitle" TEXT NOT NULL DEFAULT 'The question is anonymous. The bawal is communal.',
  "introDescription" TEXT NOT NULL DEFAULT 'Share a question, read what your campus thinks, and keep it kind. No public profile required.',
  "introCta" TEXT NOT NULL DEFAULT 'Ask anonymously', "archivedVisible" BOOLEAN NOT NULL DEFAULT true,
  "emptyStateText" TEXT NOT NULL DEFAULT 'No question is live right now. Check back soon for the next one.',
  "heroEnabled" BOOLEAN NOT NULL DEFAULT true, "heroHeading" TEXT NOT NULL DEFAULT 'BawalBox is open',
  "heroSubtitle" TEXT NOT NULL DEFAULT 'One question. Many campus answers.', "heroTagline" TEXT NOT NULL DEFAULT 'Sawaal ek, bawal anek!',
  "heroCtaLabel" TEXT NOT NULL DEFAULT 'Try the question', "heroCtaUrl" TEXT NOT NULL DEFAULT '/bawalbox',
  "heroDesktopImageUrl" TEXT, "heroMobileImageUrl" TEXT,
  "heroAltText" TEXT NOT NULL DEFAULT 'BawalBox anonymous campus questions', "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedBy" TEXT, CONSTRAINT "BawalBoxSettings_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "BawalBoxQuestion" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "instructions" TEXT, "category" TEXT,
  "startAt" TIMESTAMP(3), "endAt" TIMESTAMP(3), "status" "BawalBoxQuestionStatus" NOT NULL DEFAULT 'DRAFT',
  "featured" BOOLEAN NOT NULL DEFAULT false, "answerLimit" INTEGER, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "publishedAt" TIMESTAMP(3), CONSTRAINT "BawalBoxQuestion_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "BawalBoxResponse" (
  "id" TEXT NOT NULL, "questionId" TEXT NOT NULL, "content" TEXT NOT NULL,
  "status" "BawalBoxResponseStatus" NOT NULL DEFAULT 'PENDING', "pinned" BOOLEAN NOT NULL DEFAULT false,
  "moderatorId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  "moderatedAt" TIMESTAMP(3), CONSTRAINT "BawalBoxResponse_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BawalBoxQuestion_status_startAt_endAt_idx" ON "BawalBoxQuestion"("status", "startAt", "endAt");
CREATE INDEX "BawalBoxQuestion_featured_status_idx" ON "BawalBoxQuestion"("featured", "status");
CREATE INDEX "BawalBoxResponse_questionId_status_pinned_createdAt_idx" ON "BawalBoxResponse"("questionId", "status", "pinned", "createdAt");
CREATE INDEX "BawalBoxResponse_status_createdAt_idx" ON "BawalBoxResponse"("status", "createdAt");
ALTER TABLE "BawalBoxResponse" ADD CONSTRAINT "BawalBoxResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "BawalBoxQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BawalBoxResponse" ADD CONSTRAINT "BawalBoxResponse_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
