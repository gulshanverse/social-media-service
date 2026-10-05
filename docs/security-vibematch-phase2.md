# VibeMatch Phase 2 Authentication Security Notes

## Email identity privacy

VibeMatch stores a normalized email as a deterministic SHA-256 hash so exact identity lookup remains possible without storing plaintext email. This is appropriate for the current Phase 2 identity boundary, but deterministic hashes of common email addresses are susceptible to offline dictionary testing if the database is exposed. A keyed lookup design or a larger identity migration may be considered later; plaintext email is not stored as a workaround.

The misleading `emailCiphertext` field was removed in Phase 2.1 because the application does not currently need recoverable email data and the previous value was only the same one-way hash, not authenticated ciphertext.

## CSRF boundary

Cookie-authenticated, state-changing VibeMatch requests require an exact match against the configured `WEB_ORIGIN`. If `Origin` is unavailable, the request's `Referer` origin is used. Missing, malformed, or mismatched origins are rejected. CORS remains a browser interoperability control and is not treated as CSRF protection.

## Magic-link and answer concurrency

Magic-link verification claims a link with a conditional update requiring `usedAt IS NULL` and a future expiry before creating a session. Only the transaction that claims the row may authenticate.

Answer submission retains the database uniqueness constraints and uses a transaction plus conflict recovery. Repeated identical submissions return the existing session result, while a reused idempotency key with different answer data is rejected explicitly.

## Rate limiting

The existing in-memory `SubmissionRateLimiter` remains in place for Phase 2.1. It preserves the configured limits, caps tracked keys, and fails closed when its key capacity is exhausted. Because state is process-local, it is not a shared limiter across multiple API instances and resets on process restart. A provider/storage-agnostic shared limiter can be introduced when the deployment architecture requires horizontal scaling; Redis is intentionally not added solely for this phase.

## Email provider safety

Development uses the in-memory development adapter. Production now requires an explicitly injected `EmailProvider` and fails during provider construction if none is configured. No real provider is implemented or configured in Phase 2.1, so production startup remains intentionally blocked until an approved provider is wired in.
