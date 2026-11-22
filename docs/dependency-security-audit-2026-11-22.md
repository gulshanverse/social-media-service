# Dependency security audit

Date: 2026-11-22

## Count and scope

GitHub reported exactly **65 Dependabot alerts** on push to the repository default branch: **1 critical, 23 high, 35 moderate, and 6 low**. Direct Dependabot REST API inspection was denied with HTTP 403 (`Resource not accessible by integration`), so individual GitHub alert records could not be fetched in this session.

Package-manager audit is a separate signal. The baseline `pnpm audit --json` run found **67 advisory records** across 683 dependency entries: **1 critical, 25 high, 35 moderate, and 6 low**. These records include repeated advisory/package combinations across multiple dependency paths and do not equal the GitHub alert count.

The remediation branch is intentionally based on `origin/main`, not PR #71. No database migration, production environment, secret, merge, or deployment was performed.

## Applied compatible updates

- Updated Next.js and `eslint-config-next` to the patched 15.5 line (`15.5.29`), removing the critical SVG image-optimization RCE and the related Next.js high-severity Server Actions issue.
- Updated Vitest and jsdom within their existing major lines and made Vite an explicit dev dependency. The installed graph now resolves Vite `8.3.8` and undici `8.12.2` for the test environment.
- Kept NestJS 10, Prisma 6, and `@vercel/blob` 0.x unchanged because their exact transitive pins require compatibility/major-version decisions that were not safe to assume.

## Baseline advisory inventory

### Critical: next

- GHSA advisory `GHSA-2464-fhr4-w9xw` (audit id `1242817`): Next.js: Unauthenticated Remote Code Execution in Image Optimization API when SVG files are used. Current version(s): `15.5.25`; patched version: `>=15.5.28`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @vercel/analytics@2.0.1 > next@15.5.25`.

### High: @fastify/busboy

- GHSA advisory `GHSA-x8mw-p69m-v3mx` (audit id `1240982`): @fastify/busboy vulnerable to Denial of Service via prototype-named multipart part header. Current version(s): `2.1.1`; patched version: `>=3.2.1`. Status: **still present after branch updates**.
  Representative path: `apps/api > @vercel/blob@0.27.3 > undici@5.29.0 > @fastify/busboy@2.1.1`.

### High: body-parser

- GHSA advisory `GHSA-27r3-jxmh-p828` (audit id `1243073`): body-parser vulnerable to Denial of Service via trailing bytes after a compressed request body. Current version(s): `1.20.4`; patched version: `>=1.20.9`. Status: **still present after branch updates**.
  Representative path: `apps/api > @nestjs/core@10.4.22 > @nestjs/platform-express@10.4.22 > body-parser@1.20.4`.

### High: deepmerge-ts

- GHSA advisory `GHSA-ggr8-5vv4-36mx` (audit id `1145093`): DeepmergeTS has stack exhaustion when merging recursive object graphs. Current version(s): `7.1.5`; patched version: `>=8.0.0`. Status: **still present after branch updates**.
  Representative path: `. > @prisma/client@6.19.3 > prisma@6.19.3 > @prisma/config@6.19.3 > deepmerge-ts@7.1.5`.

### High: effect

- GHSA advisory `GHSA-7589-6fvf-x4pw` (audit id `1248071`): Effect: ReDoS in Schema.TemplateLiteral compiled regex. Current version(s): `3.21.0`; patched version: `>=3.22.1`. Status: **still present after branch updates**.
  Representative path: `. > @prisma/client@6.19.3 > prisma@6.19.3 > @prisma/config@6.19.3 > effect@3.21.0`.

### High: multer

- GHSA advisory `GHSA-xf7r-hgr6-v32p` (audit id `1113635`): Multer vulnerable to Denial of Service via incomplete cleanup. Current version(s): `2.0.2`; patched version: `>=2.1.0`. Status: **still present after branch updates**.
  Representative path: `apps/api > @nestjs/core@10.4.22 > @nestjs/platform-express@10.4.22 > multer@2.0.2`.
- GHSA advisory `GHSA-v52c-386h-88mc` (audit id `1113636`): Multer vulnerable to Denial of Service via resource exhaustion. Current version(s): `2.0.2`; patched version: `>=2.1.0`. Status: **still present after branch updates**.
  Representative path: `apps/api > @nestjs/core@10.4.22 > @nestjs/platform-express@10.4.22 > multer@2.0.2`.
- GHSA advisory `GHSA-5528-5vmv-3xc2` (audit id `1113996`): Multer Vulnerable to Denial of Service via Uncontrolled Recursion. Current version(s): `2.0.2`; patched version: `>=2.1.1`. Status: **still present after branch updates**.
  Representative path: `apps/api > @nestjs/core@10.4.22 > @nestjs/platform-express@10.4.22 > multer@2.0.2`.
- GHSA advisory `GHSA-72gw-mp4g-v24j` (audit id `1121089`): Multer vulnerable to Denial of Service via deeply nested field names. Current version(s): `2.0.2`; patched version: `>=2.2.0`. Status: **still present after branch updates**.
  Representative path: `apps/api > @nestjs/core@10.4.22 > @nestjs/platform-express@10.4.22 > multer@2.0.2`.
- GHSA advisory `GHSA-wc9g-mqfw-jrwm` (audit id `1193790`): multer vulnerable to Denial of Service via crafted multipart field names. Current version(s): `2.0.2`; patched version: `>=2.3.0`. Status: **still present after branch updates**.
  Representative path: `apps/api > @nestjs/core@10.4.22 > @nestjs/platform-express@10.4.22 > multer@2.0.2`.
- GHSA advisory `GHSA-535w-7cp7-47q4` (audit id `1193793`): multer vulnerable to Denial of Service via oversized array index in field names. Current version(s): `2.0.2`; patched version: `>=2.3.0`. Status: **still present after branch updates**.
  Representative path: `apps/api > @nestjs/core@10.4.22 > @nestjs/platform-express@10.4.22 > multer@2.0.2`.
- GHSA advisory `GHSA-q7qp-rjg7-q26m` (audit id `1243083`): multer vulnerable to Denial of Service via a pending asynchronous fileFilter after request teardown. Current version(s): `2.0.2`; patched version: `>=2.5.0`. Status: **still present after branch updates**.
  Representative path: `apps/api > @nestjs/core@10.4.22 > @nestjs/platform-express@10.4.22 > multer@2.0.2`.

### High: next

- GHSA advisory `GHSA-p3m5-59mp-jv5r` (audit id `1242819`): Next.js: Denial of Service in App Router using Server Actions. Current version(s): `15.5.25`; patched version: `>=15.5.28`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @vercel/analytics@2.0.1 > next@15.5.25`.

### High: postcss

- GHSA advisory `GHSA-6g55-p6wh-862q` (audit id `1124252`): PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments. Current version(s): `8.4.31`; patched version: `>=8.5.12`. Status: **still present after branch updates**.
  Representative path: `apps/admin > @vercel/analytics@2.0.1 > next@15.5.25 > postcss@8.4.31`.
- GHSA advisory `GHSA-r28c-9q8g-f849` (audit id `1139510`): PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure. Current version(s): `8.4.31`; patched version: `>=8.5.18`. Status: **still present after branch updates**.
  Representative path: `apps/admin > @vercel/analytics@2.0.1 > next@15.5.25 > postcss@8.4.31`.

### High: source-map-js

- GHSA advisory `GHSA-68fv-2mgg-jv7q` (audit id `1241209`): source-map-js allows event-loop denial of service through indexed source-map section offsets. Current version(s): `1.2.1`; patched version: `>=1.2.2`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @testing-library/jest-dom@7.0.1 > vitest@5.0.1 > @vitest/mocker@5.0.1 > vite@8.3.0 > postcss@8.5.28 > source-map-js@1.2.1`.

### High: undici

- GHSA advisory `GHSA-vrm6-8vpv-qv8q` (audit id `1114638`): Undici has Unbounded Memory Consumption in WebSocket permessage-deflate Decompression. Current version(s): `5.29.0`; patched version: `>=6.24.0`. Status: **still present after branch updates**.
  Representative path: `apps/api > @vercel/blob@0.27.3 > undici@5.29.0`.
- GHSA advisory `GHSA-v9p9-hfj2-hcw8` (audit id `1114640`): Undici has Unhandled Exception in WebSocket Client Due to Invalid server_max_window_bits Validation. Current version(s): `5.29.0`; patched version: `>=6.24.0`. Status: **still present after branch updates**.
  Representative path: `apps/api > @vercel/blob@0.27.3 > undici@5.29.0`.
- GHSA advisory `GHSA-xjj6-f33q-929c` (audit id `1243112`): undici vulnerable to Denial of Service via unhandled error on excessive content-encodings. Current version(s): `8.10.2`; patched version: `>=8.12.2`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @testing-library/jest-dom@7.0.1 > vitest@5.0.1 > jsdom@30.1.0 > undici@8.10.2`.
- GHSA advisory `GHSA-4w7w-5xrc-9h26` (audit id `1243472`): undici vulnerable to cache poisoning and cross-user disclosure via cross-origin redirects. Current version(s): `8.10.2`; patched version: `>=8.12.2`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @testing-library/jest-dom@7.0.1 > vitest@5.0.1 > jsdom@30.1.0 > undici@8.10.2`.
- GHSA advisory `GHSA-2m5v-pch6-74hx` (audit id `1243474`): undici vulnerable to TLS certificate validation bypass via dropped tls options in Agent. Current version(s): `8.10.2`; patched version: `>=8.12.2`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @testing-library/jest-dom@7.0.1 > vitest@5.0.1 > jsdom@30.1.0 > undici@8.10.2`.
- GHSA advisory `GHSA-2m5v-pch6-74hx` (audit id `1243476`): undici vulnerable to TLS certificate validation bypass via dropped tls options in Agent. Current version(s): `5.29.0`; patched version: `>=6.29.1`. Status: **still present after branch updates**.
  Representative path: `apps/api > @vercel/blob@0.27.3 > undici@5.29.0`.
- GHSA advisory `GHSA-qrxm-fqhp-jwvm` (audit id `1243477`): undici vulnerable to Denial of Service via TLS 1.2 certificate-changing renegotiation. Current version(s): `8.10.2`; patched version: `>=8.12.2`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @testing-library/jest-dom@7.0.1 > vitest@5.0.1 > jsdom@30.1.0 > undici@8.10.2`.
- GHSA advisory `GHSA-qrxm-fqhp-jwvm` (audit id `1243479`): undici vulnerable to Denial of Service via TLS 1.2 certificate-changing renegotiation. Current version(s): `5.29.0`; patched version: `>=6.29.1`. Status: **still present after branch updates**.
  Representative path: `apps/api > @vercel/blob@0.27.3 > undici@5.29.0`.
- GHSA advisory `GHSA-vxpw-j846-p89q` (audit id `1244534`): undici WebSocket client vulnerable to denial of service via fragment count bypass. Current version(s): `5.29.0`; patched version: `>=6.27.0`. Status: **still present after branch updates**.
  Representative path: `apps/api > @vercel/blob@0.27.3 > undici@5.29.0`.

### High: vite

- GHSA advisory `GHSA-587h-7wmj-h5pm` (audit id `1242662`): launch-editor: `fs.existsSync()` existence check can be bypassed on Windows. Current version(s): `8.3.0`; patched version: `>=8.3.3`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @testing-library/jest-dom@7.0.1 > vitest@5.0.1 > @vitest/mocker@5.0.1 > vite@8.3.0`.

### Moderate: @fastify/busboy

- GHSA advisory `GHSA-gxm5-99cw-xjw9` (audit id `1241276`): @fastify/busboy vulnerable to CRLF injection via multipart Content-Disposition filename and name. Current version(s): `2.1.1`; patched version: `>=3.2.2`. Status: **still present after branch updates**.
  Representative path: `apps/api > @vercel/blob@0.27.3 > undici@5.29.0 > @fastify/busboy@2.1.1`.

### Moderate: @nestjs/core

- GHSA advisory `GHSA-36xv-jgw5-4q75` (audit id `1117063`): @nestjs/core Improperly Neutralizes Special Elements in Output Used by a Downstream Component ('Injection'). Current version(s): `10.4.22`; patched version: `>=11.1.18`. Status: **still present after branch updates**.
  Representative path: `apps/api > @nestjs/core@10.4.22 > @nestjs/platform-express@10.4.22 > @nestjs/core@10.4.22`.

### Moderate: @vitest/mocker

- GHSA advisory `GHSA-qxg6-89mg-rqv8` (audit id `1242766`): Vitest: Code injection via unauthenticated manual mock registration. Current version(s): `5.0.1`; patched version: `>=5.0.3`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @testing-library/jest-dom@7.0.1 > vitest@5.0.1 > @vitest/mocker@5.0.1`.
- GHSA advisory `GHSA-xp26-3454-mjgp` (audit id `1242768`): Vitest: Windows backslash traversal bypasses the @vitest/mocker redirect allowlist fix. Current version(s): `5.0.1`; patched version: `>=5.0.3`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @testing-library/jest-dom@7.0.1 > vitest@5.0.1 > @vitest/mocker@5.0.1`.

### Moderate: file-type

- GHSA advisory `GHSA-5v7r-6r5c-r473` (audit id `1114301`): file-type affected by infinite loop in ASF parser on malformed input with zero-size sub-header. Current version(s): `20.4.1`; patched version: `>=21.3.1`. Status: **still present after branch updates**.
  Representative path: `apps/api > @nestjs/common@10.4.22 > file-type@20.4.1`.
- GHSA advisory `GHSA-j47w-4g3g-c36v` (audit id `1114726`): file-type: ZIP Decompression Bomb DoS via [Content_Types].xml entry. Current version(s): `20.4.1`; patched version: `>=21.3.2`. Status: **still present after branch updates**.
  Representative path: `apps/api > @nestjs/common@10.4.22 > file-type@20.4.1`.

### Moderate: minimatch

- GHSA advisory `GHSA-g3hv-75wg-m249` (audit id `1244623`): minimatch has potential denial of service via globparts amplification. Current version(s): `10.2.6`; patched version: `>=11.0.1`. Status: **still present after branch updates**.
  Representative path: `. > eslint-config-next@15.5.25 > @typescript-eslint/eslint-plugin@8.70.0 > @typescript-eslint/parser@8.70.0 > @typescript-eslint/typescript-estree@8.70.0 > minimatch@10.2.6`.

### Moderate: multer

- GHSA advisory `GHSA-3p4h-7m6x-2hcm` (audit id `1121091`): Multer vulnerable to Denial of Service via incomplete cleanup of aborted uploads. Current version(s): `2.0.2`; patched version: `>=2.2.0`. Status: **still present after branch updates**.
  Representative path: `apps/api > @nestjs/core@10.4.22 > @nestjs/platform-express@10.4.22 > multer@2.0.2`.

### Moderate: next

- GHSA advisory `GHSA-4jqv-mc3x-m676` (audit id `1241491`): Next.js has cache poisoning of SSG and ISR pages in self-hosted applications. Current version(s): `15.5.25`; patched version: `>=15.5.27`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @vercel/analytics@2.0.1 > next@15.5.25`.
- GHSA advisory `GHSA-mcj8-r9mp-w47p` (audit id `1241494`): Next.js has cache poisoning in SSG/ISR rendering that leads to cross-user content substitution and persistent denial of service. Current version(s): `15.5.25`; patched version: `>=15.5.27`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @vercel/analytics@2.0.1 > next@15.5.25`.
- GHSA advisory `GHSA-7qx7-33qx-rqx2` (audit id `1248079`): Next.js: SVG rejection bypass in the image optimization. Current version(s): `15.5.25`; patched version: `>=15.5.29`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @vercel/analytics@2.0.1 > next@15.5.25`.
- GHSA advisory `GHSA-f3mh-rxg3-f5g2` (audit id `1248081`): Next.js: HttpOnly cookie exposure through internal response header on Next.js Edge runtime routes. Current version(s): `15.5.25`; patched version: `>=15.5.29`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @vercel/analytics@2.0.1 > next@15.5.25`.
- GHSA advisory `GHSA-pc58-hwjq-p385` (audit id `1248082`): Next.js: Cross-client response injection and disclosure in self-hosted Next.js applications forwarding fetched responses. Current version(s): `15.5.25`; patched version: `>=15.5.29`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @vercel/analytics@2.0.1 > next@15.5.25`.

### Moderate: postcss

- GHSA advisory `GHSA-qx2v-qp2m-jg93` (audit id `1117015`): PostCSS has XSS via Unescaped </style> in its CSS Stringify Output. Current version(s): `8.4.31`; patched version: `>=8.5.10`. Status: **still present after branch updates**.
  Representative path: `apps/admin > @vercel/analytics@2.0.1 > next@15.5.25 > postcss@8.4.31`.
- GHSA advisory `GHSA-fxqj-rqcc-2cmp` (audit id `1130709`): PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset. Current version(s): `8.4.31`; patched version: `>=8.5.23`. Status: **still present after branch updates**.
  Representative path: `apps/admin > @vercel/analytics@2.0.1 > next@15.5.25 > postcss@8.4.31`.

### Moderate: qs

- GHSA advisory `GHSA-q8mj-m7cp-5q26` (audit id `1119502`): qs has a remotely triggerable DoS: qs.stringify crashes with TypeError on null/undefined entries in comma-format arrays when encodeValuesOnly is set. Current version(s): `6.14.2`; patched version: `>=6.15.2`. Status: **still present after branch updates**.
  Representative path: `apps/api > @nestjs/core@10.4.22 > @nestjs/platform-express@10.4.22 > body-parser@1.20.4 > qs@6.14.2`.
- GHSA advisory `GHSA-x5fp-wj9c-mxmx` (audit id `1158506`): qs array-limit bypass via bracket-key comma parsing. Current version(s): `6.14.2`; patched version: `>=6.16.0`. Status: **still present after branch updates**.
  Representative path: `apps/api > @nestjs/core@10.4.22 > @nestjs/platform-express@10.4.22 > body-parser@1.20.4 > qs@6.14.2`.
- GHSA advisory `GHSA-4mjr-xmp4-gh2g` (audit id `1158507`): qs: Denial of Service via Attacker Controlled isBuffer. Current version(s): `6.14.2`; patched version: `>=6.16.0`. Status: **still present after branch updates**.
  Representative path: `apps/api > @nestjs/core@10.4.22 > @nestjs/platform-express@10.4.22 > body-parser@1.20.4 > qs@6.14.2`.
- GHSA advisory `GHSA-6pq8-jhm2-2vcw` (audit id `1243687`): qs : qs.stringify with arrayFormat 'comma' throws an uncaught TypeError on array elements carrying a non-callable own toString (DoS). Current version(s): `6.14.2`; patched version: `>=6.16.1`. Status: **still present after branch updates**.
  Representative path: `apps/api > @nestjs/core@10.4.22 > @nestjs/platform-express@10.4.22 > body-parser@1.20.4 > qs@6.14.2`.

### Moderate: undici

- GHSA advisory `GHSA-g9mf-h72j-4rw9` (audit id `1112496`): Undici has an unbounded decompression chain in HTTP responses on Node.js Fetch API via Content-Encoding leads to resource exhaustion. Current version(s): `5.29.0`; patched version: `>=6.23.0`. Status: **still present after branch updates**.
  Representative path: `apps/api > @vercel/blob@0.27.3 > undici@5.29.0`.
- GHSA advisory `GHSA-2mjp-6q6p-2qxm` (audit id `1114594`): Undici has an HTTP Request/Response Smuggling issue. Current version(s): `5.29.0`; patched version: `>=6.24.0`. Status: **still present after branch updates**.
  Representative path: `apps/api > @vercel/blob@0.27.3 > undici@5.29.0`.
- GHSA advisory `GHSA-4992-7rv2-5pvq` (audit id `1114642`): Undici has CRLF Injection in undici via `upgrade` option. Current version(s): `5.29.0`; patched version: `>=6.24.0`. Status: **still present after branch updates**.
  Representative path: `apps/api > @vercel/blob@0.27.3 > undici@5.29.0`.
- GHSA advisory `GHSA-p88m-4jfj-68fv` (audit id `1121242`): undici vulnerable to HTTP header injection via Set-Cookie percent-decoding. Current version(s): `5.29.0`; patched version: `>=6.27.0`. Status: **still present after branch updates**.
  Representative path: `apps/api > @vercel/blob@0.27.3 > undici@5.29.0`.
- GHSA advisory `GHSA-8xcm-r25x-g524` (audit id `1130716`): undici vulnerable to downstream response desynchronization via retry interceptor. Current version(s): `5.29.0`; patched version: `>=6.28.0`. Status: **still present after branch updates**.
  Representative path: `apps/api > @vercel/blob@0.27.3 > undici@5.29.0`.
- GHSA advisory `GHSA-m8rv-5g2x-5cg5` (audit id `1130727`): undici vulnerable to CRLF Injection via blob-like body 'type' property. Current version(s): `5.29.0`; patched version: `>=6.28.0`. Status: **still present after branch updates**.
  Representative path: `apps/api > @vercel/blob@0.27.3 > undici@5.29.0`.
- GHSA advisory `GHSA-v3r7-h72x-cjcm` (audit id `1130732`): undici vulnerable to cookie attribute injection via unsanitized domain and unparsed setCookie fields. Current version(s): `5.29.0`; patched version: `>=6.28.0`. Status: **still present after branch updates**.
  Representative path: `apps/api > @vercel/blob@0.27.3 > undici@5.29.0`.
- GHSA advisory `GHSA-4qv8-2p9j-2685` (audit id `1243077`): undici vulnerable to Denial of Service via unbounded memory in the EventSource parser. Current version(s): `8.10.2`; patched version: `>=8.12.2`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @testing-library/jest-dom@7.0.1 > vitest@5.0.1 > jsdom@30.1.0 > undici@8.10.2`.
- GHSA advisory `GHSA-f72v-6w45-q472` (audit id `1243080`): undici vulnerable to Subresource Integrity bypass via non-lowercase algorithm tokens. Current version(s): `8.10.2`; patched version: `>=8.12.2`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @testing-library/jest-dom@7.0.1 > vitest@5.0.1 > jsdom@30.1.0 > undici@8.10.2`.
- GHSA advisory `GHSA-9fm3-97px-rjf6` (audit id `1243480`): undici WebSocket client vulnerable to Denial of Service via unbounded automatic PONG buffering. Current version(s): `8.10.2`; patched version: `>=8.12.2`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @testing-library/jest-dom@7.0.1 > vitest@5.0.1 > jsdom@30.1.0 > undici@8.10.2`.
- GHSA advisory `GHSA-9fm3-97px-rjf6` (audit id `1243482`): undici WebSocket client vulnerable to Denial of Service via unbounded automatic PONG buffering. Current version(s): `5.29.0`; patched version: `>=6.29.1`. Status: **still present after branch updates**.
  Representative path: `apps/api > @vercel/blob@0.27.3 > undici@5.29.0`.
- GHSA advisory `GHSA-55wc-3pg8-jfw6` (audit id `1243483`): undici vulnerable to Denial of Service via unhandled exception in the decompress interceptor. Current version(s): `8.10.2`; patched version: `>=8.12.2`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @testing-library/jest-dom@7.0.1 > vitest@5.0.1 > jsdom@30.1.0 > undici@8.10.2`.

### Moderate: vite

- GHSA advisory `GHSA-698v-4r3x-3vcv` (audit id `1242626`): launch-editor: escapeCmdArgs() omits % escaping on Windows. Current version(s): `8.3.0`; patched version: `>=8.3.3`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @testing-library/jest-dom@7.0.1 > vitest@5.0.1 > @vitest/mocker@5.0.1 > vite@8.3.0`.
- GHSA advisory `GHSA-r825-w8mm-5pxw` (audit id `1242655`): launch-editor: Editor CLI flag misinterpretation causing arbitrary command execution for some editors. Current version(s): `8.3.0`; patched version: `>=8.3.3`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @testing-library/jest-dom@7.0.1 > vitest@5.0.1 > @vitest/mocker@5.0.1 > vite@8.3.0`.
- GHSA advisory `GHSA-rq7h-c2jc-7f22` (audit id `1242734`): Vite: Files outside `server.fs.allow` could be served when project paths match system paths on non-Windows machine. Current version(s): `8.3.0`; patched version: `>=8.3.3`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @testing-library/jest-dom@7.0.1 > vitest@5.0.1 > @vitest/mocker@5.0.1 > vite@8.3.0`.
- GHSA advisory `GHSA-vfpm-58rq-9qcg` (audit id `1242737`): Vite: First 4 bytes of files outside of `server.fs` setting is exposed by `?vite-wasm-instance`. Current version(s): `8.3.0`; patched version: `>=8.3.3`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @testing-library/jest-dom@7.0.1 > vitest@5.0.1 > @vitest/mocker@5.0.1 > vite@8.3.0`.

### Low: body-parser

- GHSA advisory `GHSA-v422-hmwv-36x6` (audit id `1123977`): body-parser vulnerable to denial of service when invalid limit value silently disables size enforcement. Current version(s): `1.20.4`; patched version: `>=1.20.6`. Status: **still present after branch updates**.
  Representative path: `apps/api > @nestjs/core@10.4.22 > @nestjs/platform-express@10.4.22 > body-parser@1.20.4`.

### Low: multer

- GHSA advisory `GHSA-qvfw-j98x-7q72` (audit id `1193792`): multer vulnerable to file size limit bypass via async fileFilter race condition. Current version(s): `2.0.2`; patched version: `>=2.3.0`. Status: **still present after branch updates**.
  Representative path: `apps/api > @nestjs/core@10.4.22 > @nestjs/platform-express@10.4.22 > multer@2.0.2`.

### Low: undici

- GHSA advisory `GHSA-g8m3-5g58-fq7m` (audit id `1121255`): undici vulnerable to Set-Cookie SameSite attribute downgrade via permissive substring matching. Current version(s): `5.29.0`; patched version: `>=6.27.0`. Status: **still present after branch updates**.
  Representative path: `apps/api > @vercel/blob@0.27.3 > undici@5.29.0`.
- GHSA advisory `GHSA-35p6-xmwp-9g52` (audit id `1137243`): undici vulnerable to HTTP response queue poisoning via keep-alive socket reuse. Current version(s): `5.29.0`; patched version: `>=6.27.0`. Status: **still present after branch updates**.
  Representative path: `apps/api > @vercel/blob@0.27.3 > undici@5.29.0`.
- GHSA advisory `GHSA-r53p-7pc4-xj5r` (audit id `1240039`): undici vulnerable to downstream response splitting via retry interceptor. Current version(s): `5.29.0`; patched version: `>=6.28.1`. Status: **still present after branch updates**.
  Representative path: `apps/api > @vercel/blob@0.27.3 > undici@5.29.0`.

### Low: vite

- GHSA advisory `GHSA-9jrq-w75r-8gcw` (audit id `1242728`): Vite: Cross origin script execution through Vite custom middleware. Current version(s): `8.3.0`; patched version: `>=8.3.3`. Status: addressed or no longer present in the branch audit.
  Representative path: `apps/admin > @testing-library/jest-dom@7.0.1 > vitest@5.0.1 > @vitest/mocker@5.0.1 > vite@8.3.0`.

## Remaining remediation decisions

After the compatible updates, `pnpm audit --json` reports **43 advisory records**: 18 high, 20 moderate, and 5 low; critical is 0. The remaining high-severity records are concentrated in:

- NestJS 10 exact dependencies: multer `2.0.2`, body-parser `1.20.4`, and file-type `20.4.1`. Moving to patched versions requires either a NestJS major upgrade or a validated package-manager override/patch, neither of which is safe to claim without application-level compatibility testing.
- `@vercel/blob@0.27.3` and undici `5.29.0`, where the patched undici line is a major-version change. Upgrading Blob to its current major is a separate API-compatibility decision.
- Next.js 15.5.29 still pins PostCSS `8.4.31`; the remaining PostCSS advisories require changing that exact nested dependency and must be validated against Next’s build pipeline.
- Prisma 6.19.3 tooling dependencies (`deepmerge-ts` and `effect`) and qs, where patched transitive versions are outside the exact ranges used by the current packages.

These remaining items are explicitly not marked fixed. The exact database branch for PR #71’s additive migration remains to be confirmed from the deployment configuration. The required safe sequence is: apply the migration to the identified non-production/database branch first, verify the migration table and application read/write behavior, then schedule the same migration through the production migration workflow after review. This task did not apply any migration.

## References

- The advisory URLs and patched ranges in this report come from the saved `pnpm audit --json` output generated from the repository lockfile.
- GitHub alert count came from the GitHub push response while pushing the security branch: https://github.com/gulshanverse/social-media-service/security/dependabot
