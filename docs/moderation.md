# Moderation

The intended state flow is `PENDING → APPROVED → PUBLISHED`, with `REJECTED` and `ARCHIVED` terminal or recoverable states as appropriate. Publication is always an explicit admin action. Audit logging and role-based authorization are represented in the Prisma schema and will be wired into the admin workflow phase.
