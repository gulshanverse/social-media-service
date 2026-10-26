INSERT INTO "Permission" ("key", "description", "reserved") VALUES
  ('bawalbox.read', 'Read BawalBox content and settings', false),
  ('bawalbox.manage', 'Manage BawalBox branding and questions', false),
  ('bawalbox.moderate', 'Moderate BawalBox responses', false)
ON CONFLICT ("key") DO UPDATE SET
  "description" = EXCLUDED."description",
  "reserved" = EXCLUDED."reserved";
