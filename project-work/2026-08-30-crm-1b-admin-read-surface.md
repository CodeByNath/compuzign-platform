# CRM-1B — Admin Station read-only Request surface

## Status
- **AWAITING CHATGPT REVIEW** — family_tier identity correction applied.
- Production base: `main@08befad05a6c9c56da12fdf692641a6c6c055185`.
- Review head: `56c9f0a40dd2f0b340a8a0d32492329f7c26193f` on `review/crm-1b-admin-read-surface`.
- Source push: **NOT APPROVED**.
- Auditor verdict (prior round): **Proceed with safeguards**.

## Locked scope
CRM-1B remains read-only Admin Station Requests: durable `RequestRepository` authority, authenticated list/detail, shared Station list/drawer systems, no mutation/lifecycle/pricing/backfill work. CRM-1A stays closed.

## Audit accepted
The 21-file diff is scoped to CRM-1B. Backend list/detail now read `RequestRepository` rather than quote transients and use explicit allow-list projections. `view_secret_hash`/security plumbing is not exposed. Navigation uses the existing registries, list uses the shared Station list language, and the Request drawer is correctly registered view-only with no parallel drawer/edit framework.

## Required correction before source push
The submitted-items drawer currently assumes every stored line has `serviceTitle` + `categoryName` and types `RequestLine` that way. That is false for the platform's main `family_tier` quote path.

Authoritative `RequestSchema::sanitizeItems()` explicitly **unsets `serviceTitle` and `categoryName` for `offer_type === 'family_tier'`** and instead persists `familyTitle`, `tierTitle`, optional `tierEditionTitle`, `inclusionItems`, `legPaymentSummaries`, and Platform IDs. Current `RequestDrawerHost` renders `<strong>{item.serviceTitle}</strong>` and therefore produces a blank primary item name for the exact Package Family/Tier requests we need CRM to review.

Fix surgically on the existing review branch:
1. Make `RequestLine` reflect the actual stored union/optional shape for legacy Service vs `family_tier`; do not alter the submitted snapshot schema.
2. For `family_tier`, render a useful immutable identity from existing snapshot fields (family + Tier/Edition) instead of assuming Service fields.
3. Preserve legacy Service/Bundle display unchanged.
4. Do not re-resolve catalog data and do not add pricing computation. If showing price, keep it explicitly as the stored headline/cycle snapshot; do not imply it is TCV.
5. Extend the focused TS/PHP contract with at least one `family_tier` item proving the drawer has a nonblank family/Tier identity and still exposes no secrets/raw platform plumbing beyond intended CZR.

Do not widen scope. Push the corrected review branch only, record new SHA/tests, set **AWAITING CHATGPT REVIEW**, and stop.

## Live acceptance after eventual deployment
Browser check will be needed: Requests destination appears; the CRM-1A submitted Request shows `pending` + CZR; opening it shows contact + Package Family/Tier snapshot read-only; no secret/meta/post IDs; customer quote/view/print remains unchanged.

---

## Claude Report — correction applied — 2026-08-30

Review branch unchanged (`review/crm-1b-admin-read-surface`), one new commit: `56c9f0a4`. Pushed. Not merged to `main`.

### Fix, addressing all five required points

1. `RequestLine` (`resources/ts/api/types/admin.ts`) now matches `RequestSchema::sanitizeItems()`'s real shape exactly: `offer_type/tierTitle/tierId/price/billingCycle/features/isAddon` are the only fields common to both branches; `serviceId/serviceTitle/categoryName/serviceDescription/bundleDescription` are legacy-only, and `familyId/familyPlatformId/familyTitle/tierInstanceId/tierInstancePlatformId/tierOccupantId/tierPlatformId/tierEditionPlatformId/tierEditionTitle/inclusionItems/legPaymentSummaries` are `family_tier`-only — verified against `main`'s actual `RequestSchema.php`, not assumed. No submitted-snapshot schema change.
2. New `requestItemDisplay()` (`resources/ts/admin-station/stations/requests/requestItemDisplay.ts`) — a pure projection, not inline branching — renders `familyTitle` as title and `tierTitle · tierEditionTitle` as subtitle for a `family_tier` line.
3. The same function's legacy branch is byte-identical to the prior inline logic (`serviceTitle` / `categoryName · tierTitle`) — proven by a fixture-based regression, not just inspection.
4. Price still reads only the line's own stored `price`/`billingCycle` — `legPaymentSummaries` is never touched by the display projection, so nothing implies a computed total contract value.
5. Extended both contracts: `scripts/requests-admin-station-surface-contract.ts` now calls `requestItemDisplay()` directly against a `family_tier` fixture (asserts non-blank title/subtitle, headline-only price) and a legacy fixture (asserts unchanged output), plus a check that no per-item Platform ID string leaks into the display. `tests/admin-requests-durable-surface.php` adds a `family_tier` item through a full durable Request and asserts `detail()` passes it through byte-for-byte, still with no server-side-backfilled `serviceTitle`.

### Validation

All pass: `tests/admin-requests-durable-surface.php` (now 4 durable Requests including the family_tier case), the full existing Request/identity/Category/notification suite, `contract:requests-admin-station-surface`, `contract:station-tabset`, `tsc --noEmit`, `build`, `docs:check`. `contract:admin-station-css`'s 6 pre-existing unrelated `cz-rate-sheet-tool__*` failures are unchanged (still confirmed via `git stash` not caused by this branch).

Set to **AWAITING CHATGPT REVIEW**. Source not pushed to `main`.
