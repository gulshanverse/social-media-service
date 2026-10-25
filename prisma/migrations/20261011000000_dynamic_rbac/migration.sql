CREATE TYPE "PermissionEffect" AS ENUM ('GRANT', 'DENY');

CREATE TABLE "Permission" (
  "key" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "reserved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Permission_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "AdminRoleDefinition" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "system" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminRoleDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminRolePermission" (
  "roleId" TEXT NOT NULL,
  "permissionKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminRolePermission_pkey" PRIMARY KEY ("roleId", "permissionKey")
);

CREATE TABLE "AdminRoleAssignment" (
  "adminId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminRoleAssignment_pkey" PRIMARY KEY ("adminId", "roleId")
);

CREATE TABLE "AdminPermissionOverride" (
  "adminId" TEXT NOT NULL,
  "permissionKey" TEXT NOT NULL,
  "effect" "PermissionEffect" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminPermissionOverride_pkey" PRIMARY KEY ("adminId", "permissionKey")
);

CREATE UNIQUE INDEX "AdminRoleDefinition_key_key" ON "AdminRoleDefinition"("key");
CREATE INDEX "AdminRoleDefinition_system_key_idx" ON "AdminRoleDefinition"("system", "key");
CREATE INDEX "AdminRolePermission_permissionKey_idx" ON "AdminRolePermission"("permissionKey");
CREATE INDEX "AdminRoleAssignment_roleId_idx" ON "AdminRoleAssignment"("roleId");
CREATE INDEX "AdminPermissionOverride_permissionKey_effect_idx" ON "AdminPermissionOverride"("permissionKey", "effect");

ALTER TABLE "AdminRolePermission" ADD CONSTRAINT "AdminRolePermission_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "AdminRoleDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminRolePermission" ADD CONSTRAINT "AdminRolePermission_permissionKey_fkey"
  FOREIGN KEY ("permissionKey") REFERENCES "Permission"("key") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminRoleAssignment" ADD CONSTRAINT "AdminRoleAssignment_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminRoleAssignment" ADD CONSTRAINT "AdminRoleAssignment_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "AdminRoleDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminPermissionOverride" ADD CONSTRAINT "AdminPermissionOverride_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminPermissionOverride" ADD CONSTRAINT "AdminPermissionOverride_permissionKey_fkey"
  FOREIGN KEY ("permissionKey") REFERENCES "Permission"("key") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Permission" ("key", "description", "reserved") VALUES
  ('dashboard.read', 'Read dashboard aggregates', false),
  ('users.manage', 'Manage administrator accounts', true),
  ('sessions.manage', 'Revoke administrator sessions', true),
  ('confessions.read', 'Read confession moderation records', false),
  ('confessions.edit', 'Edit confession content', false),
  ('confessions.moderate', 'Transition confession moderation state', false),
  ('confessions.delete', 'Permanently delete confessions', false),
  ('reports.read', 'Read confession reports', false),
  ('reports.manage', 'Resolve and dismiss confession reports', false),
  ('audit.read', 'Read audit activity', false),
  ('themes.read', 'Read themes', false),
  ('themes.manage', 'Create and manage themes', false),
  ('profile.manage', 'Manage profile settings', false),
  ('garba.read', 'Read Garba moderation records', false),
  ('garba.edit', 'Edit Garba content', false),
  ('garba.moderate', 'Transition Garba moderation state', false),
  ('garba.seasons.manage', 'Manage Garba seasons', false),
  ('roles.manage', 'Manage custom administrator roles', true),
  ('permissions.manage', 'Assign permissions and overrides', true)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "AdminRoleDefinition" ("id", "key", "name", "description", "system", "updatedAt") VALUES
  ('rbac-role-moderator', 'MODERATOR', 'Moderator', 'Legacy moderator capability set', true, CURRENT_TIMESTAMP),
  ('rbac-role-designer', 'DESIGNER', 'Designer', 'Legacy designer capability set', true, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "AdminRolePermission" ("roleId", "permissionKey")
SELECT 'rbac-role-moderator', "key" FROM "Permission"
WHERE "key" IN ('dashboard.read', 'confessions.read', 'confessions.edit', 'confessions.moderate', 'reports.read', 'reports.manage', 'themes.read', 'garba.read', 'garba.edit', 'garba.moderate')
ON CONFLICT DO NOTHING;
INSERT INTO "AdminRolePermission" ("roleId", "permissionKey")
SELECT 'rbac-role-designer', "key" FROM "Permission"
WHERE "key" IN ('dashboard.read', 'themes.read', 'themes.manage', 'profile.manage')
ON CONFLICT DO NOTHING;

INSERT INTO "AdminRoleAssignment" ("adminId", "roleId")
SELECT "id", CASE WHEN "role" = 'MODERATOR'::"AdminRole" THEN 'rbac-role-moderator' ELSE 'rbac-role-designer' END
FROM "AdminUser" WHERE "role" IN ('MODERATOR'::"AdminRole", 'DESIGNER'::"AdminRole")
ON CONFLICT DO NOTHING;
