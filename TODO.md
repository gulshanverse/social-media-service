

## Audit-fix pass

- [x] Shared banner CSS is centralized in `packages/ui` and imported by admin and web apps.
- [x] Built-in theme IDs are explicitly validated independently from runtime fallback resolution.
- [x] Database theme lifecycle and schedule windows are enforced at publication time.
- [x] Admin theme cards show available, draft, scheduled, expired, and unpublished states.
- [x] Shared alignment and nine-way position transforms are explicit and responsive-safe.
- [x] API tests cover theme validation, lifecycle windows, invalid layouts, malformed payloads, fallback, and safe public projection.
- [x] Audit changes are ready to commit and push on the existing feature branch.
- [ ] Browser screenshot verification remains pending until a running authenticated app/database environment is available.
- [ ] Pull request creation remains pending explicit user instruction; no open PR currently exists for the branch.
