# VibeMatch Phase 3: deterministic matching and discovery

## Product boundary

VibeMatch discovery is a **game result**, not a public directory, swipe feed, attractiveness ranking, or AI recommendation. A completed VibeMatch session is the entry point. This phase adds no chat, connection reveal, Instagram exposure, cross-college discovery, or relationship between VibeMatch identities and Confession/Garba identities.

## Eligibility before scoring

The discovery query first filters in PostgreSQL and is capped at 500 candidate profiles before application-level scoring. A requester must have an active VibeMatch identity, an active profile at an active college, confirmed 18+ eligibility, and a completed session covering all **seven required rounds** with a valid DNA snapshot. Candidates must also:

- be a different identity from the requester and belong to the same active college/campus;
- have an active profile and active identity, with 18+ eligibility confirmed;
- have a completed session with all recorded rounds answered and a valid snapshot;
- not be deleted, suspended, paused, or hidden; and
- have no block in either direction with the requester.

Eligibility is a hard gate: no score can reinstate a candidate who fails it. Incomplete or invalid profiles are never projected. The endpoint derives requester identity from the existing HttpOnly VibeMatch session and accepts neither requester identity nor DNA/score inputs.

## Deterministic scoring (`MATCHING_ALGORITHM_VERSION = "v1"`)

All DNA coordinates are server-produced integers in `[0, 100]`. Similarity is weighted absolute-distance similarity, rounded to an integer:

```text
DNA = round( Σ(weight[d] × (100 - |requester[d] - candidate[d]|)) / 100 )
```

| Existing DNA dimension | Weight within DNA component |
| ---------------------- | --------------------------: |
| Social Energy          |                         20% |
| Adventure              |                         15% |
| Spontaneity            |                         15% |
| Humor                  |                         15% |
| Communication          |                         20% |
| Intent                 |                         15% |

The existing six-dimensional DNA schema remains unchanged. Primary/secondary connection goals are separately scored through a dedicated intent compatibility table; intent is not treated as an inherently better or worse personality trait.

### Intent compatibility

The intent score is the highest table value across the requester's and candidate's declared primary/secondary intents. The matrix is symmetric; same-intent pairs are strong, cross-intent pairs are partial rather than a universal exclusion, and “Just meeting people” remains broadly compatible.

| Intent              | Special | Friends | Event | Study | Gaming | Just meeting |
| ------------------- | ------: | ------: | ----: | ----: | -----: | -----------: |
| Someone special     |     100 |      45 |    50 |    45 |     40 |           58 |
| New friends         |      45 |     100 |    82 |    70 |     72 |           88 |
| Event partner       |      50 |      82 |   100 |    62 |     68 |           86 |
| Study buddy         |      45 |      70 |    62 |   100 |     55 |           76 |
| Gaming buddy        |      40 |      72 |    68 |    55 |    100 |           78 |
| Just meeting people |      58 |      88 |    86 |    76 |     78 |          100 |

### Interests and confidence

Interest tags are Unicode NFKC-normalized, trimmed, lowercased, deduplicated, and bounded to 20 tags. When both participants have tags, interest overlap is Jaccard similarity (`intersection / union × 100`), rounded to an integer. If either set is empty, the score is neutral `50`, not a penalty for sparse profile data.

The 5% confidence component is the lower of the two valid server-stored DNA snapshot coverage percentages. Completion and valid snapshot are hard requirements; coverage is not based on profile views, followers, likes, or popularity. The Phase 2.1 game normally has complete coverage, so confidence may be the same for many eligible users; the value is retained as a directly measured data-quality signal rather than a new behavioral metric.

```text
Final = round(clamp(0.60 × DNA + 0.20 × Intent + 0.15 × Interests
                    + 0.05 × Confidence, 0, 100))
```

The server calculates and returns one integer percentage. The browser never submits authoritative DNA, score, candidate access, or algorithm version.

## Top-three selection and explanation

Candidate profiles are database-filtered before a fixed maximum of 500 records enter the pure matching service. The service scores eligible candidates, sorts by final score descending, intent score descending, interest overlap descending, then a private stable SHA-256 tie-break derived from the two internal identity IDs. Tie-break material and internal IDs are never returned. Duplicate identities are removed and no more than three results are exposed. Refreshing the same underlying data produces the same ordering.

Each result shows only a nickname, same-campus name, rounded compatibility percentage, deterministic playful title/tagline, up to four “Why your vibes line up” explanations, and up to three shared structured-interest labels. Empty pools produce a human-readable empty state, never fabricated candidates or scores.

## Persistence and blocking

Compatibility results are recomputed on each authenticated `GET /vibematch/discovery`; a match-result table is not justified for this MVP because there is no acceptance, reveal, or chat lifecycle. A minimal `VibeBlock` record is persisted because reciprocal block checks must survive refreshes. `VibeProfile.discoveryKey` is a random opaque token used only to submit a block for a previously returned result; it is not a database ID or profile-lookup endpoint. The client has no arbitrary profile search API. Block records are identity-to-identity and do not reference Confession or Garba data.

## API contracts

- `GET /vibematch/discovery` — requires the existing authenticated VibeMatch session. No requester ID or query/body values. Returns `{ algorithmVersion, campus, matches }`, with at most three safe public presentation records. An incomplete game returns a safe `400`; an invalid/inactive requester returns `403`.
- `POST /vibematch/blocks` — requires the authenticated session and Phase 2.1 exact-origin CSRF guard. Accepts `{ matchKey }` for a same-college opaque key previously returned by discovery. The server derives the blocker identity, rejects self/cross-college identifiers, and applies an in-memory rate limit (40/hour); repeated blocking is idempotent.
- `DELETE /vibematch/blocks/:matchKey` — requires the authenticated session and the same exact-origin CSRF guard. Removes only the caller's same-campus block, allowing an accidental hide to be undone.

No email, Instagram username, authentication/session data, database ID, IP, moderation/security metadata, confession history, or Garba history is exposed. No migration is executed against any database by this work.
