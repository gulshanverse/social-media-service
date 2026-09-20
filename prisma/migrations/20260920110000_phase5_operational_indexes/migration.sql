-- Phase 5 indexes support server-side moderation, report, and audit queries.
CREATE INDEX "Confession_themeId_createdAt_idx" ON "Confession"("themeId", "createdAt");
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
CREATE INDEX "Report_confessionId_idx" ON "Report"("confessionId");
CREATE INDEX "Report_reviewerId_idx" ON "Report"("reviewerId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "AuditLog_entity_createdAt_idx" ON "AuditLog"("entity", "createdAt");
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");
