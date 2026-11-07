CREATE TYPE "HomepagePromotionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DISABLED');

CREATE TABLE "HomepagePromotion" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "badgeText" TEXT,
  "desktopImageUrl" TEXT NOT NULL,
  "desktopImageKey" TEXT NOT NULL,
  "mobileImageUrl" TEXT,
  "mobileImageKey" TEXT,
  "imageAlt" TEXT,
  "ctaLabel" TEXT,
  "destinationUrl" TEXT,
  "status" "HomepagePromotionStatus" NOT NULL DEFAULT 'DRAFT',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "startAt" TIMESTAMP(3),
  "endAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdById" TEXT,
  "updatedById" TEXT,
  CONSTRAINT "HomepagePromotion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HomepagePromotion_status_startAt_endAt_priority_idx"
  ON "HomepagePromotion"("status", "startAt", "endAt", "priority");
CREATE INDEX "HomepagePromotion_priority_createdAt_idx"
  ON "HomepagePromotion"("priority", "createdAt");

ALTER TABLE "HomepagePromotion" ADD CONSTRAINT "HomepagePromotion_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HomepagePromotion" ADD CONSTRAINT "HomepagePromotion_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Permission" ("key", "description", "reserved")
VALUES ('homepage-promotions.manage', 'Manage homepage promotions', false)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "AdminRolePermission" ("roleId", "permissionKey")
SELECT role."id", permission."key"
FROM "AdminRoleDefinition" AS role
CROSS JOIN "Permission" AS permission
WHERE role."key" = 'DESIGNER'
  AND permission."key" = 'homepage-promotions.manage'
ON CONFLICT DO NOTHING;
