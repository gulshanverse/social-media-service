# Homepage Promotions

Homepage Promotions is the owner-managed poster and announcement carousel beneath the public homepage hero. It is separate from AdSense: it does not change ad eligibility, consent, or script behavior. Promotion content can be changed in the admin dashboard without a code change or a deployment.

## First poster workflow

1. Sign in to the existing Admin Dashboard as a `SUPER_ADMIN` or `DESIGNER`, then open **Homepage Promotions**.
2. Choose **Create promotion**, enter a title, upload a desktop PNG/JPG/WEBP poster, and optionally upload a mobile version.
3. Add optional description, badge text, accessible image alt text, CTA label, and destination. Destinations may be a same-site root path such as `/events` or an absolute HTTPS URL; insecure HTTP, protocol-relative, credential-bearing, and script URLs are rejected.
4. Use the **Desktop** and **Mobile** preview before publishing. Set an optional start and end time using the browser's local time; both are persisted as UTC. Set display priority if needed (higher values appear first).
5. Choose **Save draft** or **Publish**. A published promotion with a future start is listed as **Scheduled** and remains hidden until its start time. An expired promotion is hidden automatically. Use **Unpublish** to remove it immediately or **Publish** to republish it later.
6. Reorder campaigns with the up/down actions. Delete asks for confirmation. Replacing or deleting artwork removes an old project-owned blob only when no promotion still references it.

The public carousel appears only when at least one promotion is active. If not, it renders nothing and the existing homepage content remains in place; there is no empty carousel or placeholder poster.

## Roles and security

The existing admin session and API guards are reused. The `homepage-promotions.manage` permission is catalogued for the Designer workflow and is included in the `DESIGNER` system role; `SUPER_ADMIN` retains full access. The API enforces the permission for every list/detail/mutation/upload operation, so hiding the navigation item is not the security boundary. There are no public write routes.

Image upload accepts PNG, JPEG, or WebP; the default size limit is 5 MiB and the decode ceiling is 20 megapixels. Configure `HOMEPAGE_PROMOTION_MAX_UPLOAD_BYTES` on the API and the matching `NEXT_PUBLIC_HOMEPAGE_PROMOTION_MAX_UPLOAD_BYTES` at admin build time (1–20 MiB; both default to 5 MiB). The client checks the selected MIME type and size, and the API independently decodes the bytes with Sharp, verifies the actual format, dimensions, and image stream, and rejects header/content mismatches. The authenticated upload route is throttled using the existing process-local limiter, configured by `HOMEPAGE_PROMOTION_UPLOAD_RATE_LIMIT` and `HOMEPAGE_PROMOTION_UPLOAD_RATE_WINDOW_SECONDS`. Images are stored in the existing Vercel Blob store under `college-confession/promotions/`; only URL, storage pathname, dimensions, and byte size are returned to the authenticated editor. The API never returns the Blob token. A failed edit preserves the current database artwork; cleanup checks the project-owned storage prefix and references from other promotions before deleting an image.

The API uses server time to determine visibility: publication state must be `PUBLISHED`, `startAt` must be absent or at/before now, and `endAt` must be absent or strictly after now. Ordering is deterministic: priority descending, then creation time descending, then ID ascending. Public reads use `no-store` and return only fields consumed by the homepage.

## API routes

| Method and path                                  | Access            | Purpose                                                     |
| ------------------------------------------------ | ----------------- | ----------------------------------------------------------- |
| `GET /homepage-promotions`                       | Public, read-only | Active published promotions only                            |
| `GET /admin/homepage-promotions?page=1&limit=50` | Admin permission  | Paginated management list                                   |
| `GET /admin/homepage-promotions/:id`             | Admin permission  | Management detail                                           |
| `POST /admin/homepage-promotions`                | Admin permission  | Create a draft/published record                             |
| `PATCH /admin/homepage-promotions/:id`           | Admin permission  | Edit text, media references, state, schedule, or priority   |
| `POST /admin/homepage-promotions/:id/publish`    | Admin permission  | Publish/republish                                           |
| `POST /admin/homepage-promotions/:id/unpublish`  | Admin permission  | Return to draft                                             |
| `POST /admin/homepage-promotions/reorder`        | Admin permission  | Save the visible ordered ID list                            |
| `DELETE /admin/homepage-promotions/:id`          | Admin permission  | Delete record and safely clean unreferenced project artwork |
| `POST /admin/homepage-promotions/upload`         | Admin permission  | Authenticated multipart image upload (`file`)               |

Management lists are bounded to 1–100 items per page; reorder accepts up to 100 IDs in the submitted order.

## Configuration and migrations

The upload feature reuses the existing `BLOB_READ_WRITE_TOKEN` Vercel Blob credential; no new provider, paid integration, or credential is introduced. If that token is absent, upload returns a configuration error rather than storing a poster in the database. The environment template documents the token and the optional upload/rate-limit variables.

The additive Prisma migration is `prisma/migrations/20261107100000_homepage_promotions/migration.sql`. It creates the status enum/table/indexes, sets nullable admin audit relations, registers the permission, and adds it to the existing Designer system role. Before deploying the API/web changes, apply the migration using the repository's normal release workflow (`pnpm db:migrate:deploy`) after validating it in a non-production environment. Generate the client from the same schema as part of the build. This implementation does not run migrations, alter production settings/data, or deploy anything.

## Rollback and operational notes

Roll back by first disabling the new admin/public UI and API deployment, then use a reviewed down-migration in the target environment to remove only the new promotion table, enum, permission grant, and permission row. Do not hand-delete campaign blobs while records may still reference them. Database backup/restore remains the platform's normal migration safety mechanism; the code migration is additive and leaves existing home, content, ad, and profile records untouched.

Promotion click/impression analytics are intentionally not included: there is no current first-party measurement surface that can count them reliably without adding extra data collection or infrastructure. There is also no separate duplication action; admins can create another campaign from the same workflow.
