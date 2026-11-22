# Dependency audit follow-up (2026-11-22)

Reproduced on branch `security/dependabot-remediation` with pnpm `9.15.4` using `pnpm audit --json`. The raw output is stored alongside this document in `dependency-audit-2026-11-22.json`.

## Counts

- Dependencies: **675**
- Critical: **0**
- High: **7**
- Moderate: **13**
- Low: **3**
- Total advisories: **23**

## Remaining vulnerable chains

### `@fastify/busboy`

- **high** advisory 1240982: @fastify/busboy vulnerable to Denial of Service via prototype-named multipart part header. Resolved versions: `>=3.2.1`. Affected versions: `2.1.1`.
- **moderate** advisory 1241276: @fastify/busboy vulnerable to CRLF injection via multipart Content-Disposition filename and name. Resolved versions: `>=3.2.2`. Affected versions: `2.1.1`.

### `@nestjs/core`

- **moderate** advisory 1117063: @nestjs/core Improperly Neutralizes Special Elements in Output Used by a Downstream Component ('Injection'). Resolved versions: `>=11.1.18`. Affected versions: `10.4.22`.

### `deepmerge-ts`

- **high** advisory 1145093: DeepmergeTS has stack exhaustion when merging recursive object graphs. Resolved versions: `>=8.0.0`. Affected versions: `7.1.5`.

### `file-type`

- **moderate** advisory 1114301: file-type affected by infinite loop in ASF parser on malformed input with zero-size sub-header. Resolved versions: `>=21.3.1`. Affected versions: `20.4.1`.
- **moderate** advisory 1114726: file-type: ZIP Decompression Bomb DoS via [Content_Types].xml entry. Resolved versions: `>=21.3.2`. Affected versions: `20.4.1`.

### `minimatch`

- **moderate** advisory 1244623: minimatch has potential denial of service via globparts amplification. Resolved versions: `>=11.0.1`. Affected versions: `10.2.6`.

### `undici`

- **moderate** advisory 1112496: Undici has an unbounded decompression chain in HTTP responses on Node.js Fetch API via Content-Encoding leads to resource exhaustion. Resolved versions: `>=6.23.0`. Affected versions: `5.29.0`.
- **moderate** advisory 1114594: Undici has an HTTP Request/Response Smuggling issue. Resolved versions: `>=6.24.0`. Affected versions: `5.29.0`.
- **high** advisory 1114638: Undici has Unbounded Memory Consumption in WebSocket permessage-deflate Decompression. Resolved versions: `>=6.24.0`. Affected versions: `5.29.0`.
- **high** advisory 1114640: Undici has Unhandled Exception in WebSocket Client Due to Invalid server_max_window_bits Validation. Resolved versions: `>=6.24.0`. Affected versions: `5.29.0`.
- **moderate** advisory 1114642: Undici has CRLF Injection in undici via `upgrade` option. Resolved versions: `>=6.24.0`. Affected versions: `5.29.0`.
- **moderate** advisory 1121242: undici vulnerable to HTTP header injection via Set-Cookie percent-decoding. Resolved versions: `>=6.27.0`. Affected versions: `5.29.0`.
- **low** advisory 1121255: undici vulnerable to Set-Cookie SameSite attribute downgrade via permissive substring matching. Resolved versions: `>=6.27.0`. Affected versions: `5.29.0`.
- **moderate** advisory 1130716: undici vulnerable to downstream response desynchronization via retry interceptor. Resolved versions: `>=6.28.0`. Affected versions: `5.29.0`.
- **moderate** advisory 1130727: undici vulnerable to CRLF Injection via blob-like body 'type' property. Resolved versions: `>=6.28.0`. Affected versions: `5.29.0`.
- **moderate** advisory 1130732: undici vulnerable to cookie attribute injection via unsanitized domain and unparsed setCookie fields. Resolved versions: `>=6.28.0`. Affected versions: `5.29.0`.
- **low** advisory 1137243: undici vulnerable to HTTP response queue poisoning via keep-alive socket reuse. Resolved versions: `>=6.27.0`. Affected versions: `5.29.0`.
- **low** advisory 1240039: undici vulnerable to downstream response splitting via retry interceptor. Resolved versions: `>=6.28.1`. Affected versions: `5.29.0`.
- **high** advisory 1243476: undici vulnerable to TLS certificate validation bypass via dropped tls options in Agent. Resolved versions: `>=6.29.1`. Affected versions: `5.29.0`.
- **high** advisory 1243479: undici vulnerable to Denial of Service via TLS 1.2 certificate-changing renegotiation. Resolved versions: `>=6.29.1`. Affected versions: `5.29.0`.
- **moderate** advisory 1243482: undici WebSocket client vulnerable to Denial of Service via unbounded automatic PONG buffering. Resolved versions: `>=6.29.1`. Affected versions: `5.29.0`.
- **high** advisory 1244534: undici WebSocket client vulnerable to denial of service via fragment count bypass. Resolved versions: `>=6.27.0`. Affected versions: `5.29.0`.

## Compatibility upgrade plans

- **undici / @fastify/busboy:** upgrade the owning `@vercel/blob` integration to a release that resolves to an undici 6.x/6.29.1-or-later line and busboy 3.2.2-or-later, then run upload, blob, API, and build validation. Do not force an incompatible undici or busboy major through an override.
- **Prisma / deepmerge-ts:** evaluate a Prisma release whose supported `@prisma/config` dependency resolves `deepmerge-ts` 8.x, then run Prisma validate/generate, API tests, and a disposable-database integration test. Do not override deepmerge-ts across Prisma’s declared compatibility range.
- **Nest/file-type and lint/minimatch:** assess upgrades in their owning NestJS and ESLint/TypeScript-ESLint lines separately; keep the current PR scoped to compatible upgrades and validate behavior before adoption.

## Decision

No unsafe major-version overrides were added. The compatible dependency upgrades already in PR #72 are preserved; the remaining chains require separate compatibility work.
