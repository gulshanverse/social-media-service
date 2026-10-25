# BawalBox

BawalBox is implemented as a separate public question-and-answer surface backed by the existing NestJS, Prisma, admin-session, permission, audit, and rate-limit infrastructure.

The public API is `GET /bawalbox` and `POST /bawalbox/questions/:id/responses`. Public reads expose configured branding, the current scheduled/featured published question, approved responses only, and an optional archive. Anonymous responses never persist a profile identifier or request metadata in the BawalBox tables; they enter `PENDING` moderation and are rate-limited using the existing process-local submission limiter.

The protected CMS is under `/admin/bawalbox`. `BAWALBOX_READ` covers settings, questions, and response queues. `BAWALBOX_MANAGE` covers branding and question changes for `SUPER_ADMIN` and `DESIGNER`. `BAWALBOX_MODERATE` covers response approval, rejection, archive, and pinning for `SUPER_ADMIN` and `MODERATOR`. Successful settings, question, and response actions write append-only audit records.

The Prisma migration `20261025000000_add_bawalbox` creates `BawalBoxSettings`, `BawalBoxQuestion`, and `BawalBoxResponse` plus their status enums and indexes. Routine branding and question content is database-backed and does not require a frontend deployment. The public route has safe in-code defaults if settings have not been initialized yet.

The first release intentionally uses the existing design system and featured-service carousel rather than replacing the current confession hero. It adds BawalBox to the public header, homepage service discovery, and confession-feed service slides. Banner media fields are persisted and validated for HTTPS URLs; an upload UI can be added in a follow-up using the existing Vercel Blob upload path after product approval of crop and responsive-image behavior.

Before production rollout, apply the migration through the repository's dedicated migration/release job, verify the API readiness endpoint, create and publish a first weekly question from BawalBox Studio, and smoke-test `/bawalbox`, response moderation, and the existing `/confessions` feed.
