# CRM-1B — Admin Station read-only Request surface

## Status
- **AWAITING CHATGPT REVIEW** — type-contract correction applied.
- Production base: `main@08befad05a6c9c56da12fdf692641a6c6c055185`.
- Review head: `fe5725db` on `review/crm-1b-admin-read-surface`.
- Source push: **NOT APPROVED**.
- Auditor verdict (prior round): **Proceed with safeguards**.

## Locked CRM-1B scope
Read-only Admin Station Requests only: durable `RequestRepository` authority, authenticated list/detail, shared Station list/drawer systems, no mutation/lifecycle/pricing/backfill work. CRM-1A remains closed.

## Fix report — type-contract correction (`56c9f0a4` → `fe5725db`)
Verified against `main`'s actual `RequestSchema::sanitizeItems()`: `promotion_id`, `billing_label`, `minimumTermValue`, and `minimumTermUnit` are sanitized and stored unconditionally on both the legacy and `family_tier` branches (confirmed by reading the sanitizer source directly, not assumed).

Applied, review branch only:
1. Added all four fields to `RequestLine` in `admin.ts` with exact sanitizer nullability (`promotion_id: string`, `billing_label: string`, `minimumTermValue: number | null`, `minimumTermUnit: string | null`).
2. Corrected the common-field comment to list all seven fields the two branches actually share.
3. Extended both `requests-admin-station-surface-contract.ts` fixtures (`familyLine`, `legacyLine`) with the four new required fields so the contract keeps type-checking against the corrected interface.
4. Confirmed `AdminRequestsController::detail()` already returns `$data['items']` verbatim (no per-item allow-list) — these fields were already reaching the frontend at runtime; this was a type-declaration gap only, no payload or rendering change.
5. Did not touch the PHP byte-for-byte pass-through test — its existing fixture and assertion already prove the point for whatever fields it carries; not widened per the correction's own scope.

Full validation sweep passed on the review branch: `tsc --noEmit`, `npm run build`, `contract:requests-admin-station-surface`, `php tests/admin-requests-durable-surface.php`, `contract:station-tabset`, `npm run docs:check`.

Two files changed: `resources/ts/api/types/admin.ts`, `scripts/requests-admin-station-surface-contract.ts`.

## Live acceptance after deployment
Browser validation remains required: Requests destination appears; the CRM-1A Request shows `pending` + CZR; drawer shows contact + Package Family/Tier snapshot read-only; no secret/meta/post IDs; customer quote/view/print remains unchanged.
