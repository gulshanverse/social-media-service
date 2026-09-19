# Moderation

The explicit confession workflow is:

```text
PENDING ── approve ──> PUBLISHED ── archive ──> ARCHIVED
   └──── reject ─────> REJECTED
```

Only `SUPER_ADMIN` and `MODERATOR` can read, edit, or transition confession records. Edits are allowed only while a confession is `PENDING`; published, rejected, and archived records are immutable through the edit endpoint. Editable fields are `content`, `category`, and `themeId`, where `themeId` is the actual database Theme ID. Content is trimmed, `originalContent` is immutable, and the current editor is recorded in `editorId`.

Reports have one-way transitions only: `OPEN` can become `RESOLVED` or `DISMISSED`. Any transition from `RESOLVED`, `DISMISSED`, or `ARCHIVED` is rejected with a business-rule error and does not create a success audit event. Successful report mutations preserve reviewer and resolution timestamps and create an audit record after the mutation succeeds.

Themes are readable by all three admin roles. Theme creation and updates are limited to `SUPER_ADMIN` and `DESIGNER`; theme slugs are immutable after creation. Theme DTOs reject unknown fields and constrain slug, name, style strings, and radius values.
