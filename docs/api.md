# API

The API is hosted by NestJS on port 4000 in local development. `GET /health` is the foundation health endpoint. Phase 2 adds the public confession endpoints below.

## Public endpoints

### `POST /confessions`

Accepts `{ "content": "...", "category": "CRUSH", "themeId": "midnight" }`. Content is trimmed, validated server-side, associated with a database theme, and stored as `PENDING` with `publishedAt = null`. The safe response is `{ "publicId": "...", "status": "PENDING", "message": "Your confession has been submitted for review." }`.

### `GET /confessions?page=1&limit=12`

Returns a paginated safe projection containing only published confessions, public IDs, content, category, safe theme styling, and publication date. Results are newest first.

### `GET /confessions/:publicId`

Returns a single published confession and increments its view count. Any non-published or unknown confession returns a public-safe not-found response.

## Validation and limits

DTO validation rejects malformed content, invalid categories, and oversized requests. Anonymous submissions use the `SUBMISSION_RATE_LIMIT` and `SUBMISSION_RATE_WINDOW_SECONDS` environment variables and return HTTP 429 when the in-memory process-local limit is exceeded. This is a Phase 2 baseline; distributed limiting will require shared infrastructure in a later security phase.
