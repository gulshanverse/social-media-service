# Moderation

The explicit confession workflow is:

```text
PENDING ── approve ──> PUBLISHED ── archive ──> ARCHIVED
   └──── reject ────> REJECTED ── archive ──> ARCHIVED
```

Only `PENDING` confessions can be approved or rejected. Published and rejected records can be archived. There is no raw status patch endpoint. Approval sets `publishedAt`, and the public feed and detail endpoint continue to return `PUBLISHED` records only.

Moderators can edit current `content`, `category`, and `themeId` before a transition. `originalContent` is immutable and retained for traceability. Important mutations create append-only audit records containing actor, action, entity, entity ID, timestamp, and limited metadata.

Reports move from `OPEN` to `RESOLVED` or `DISMISSED`. Resolved and dismissed reports remain historically visible to administrators. Reporter identity is not public.
