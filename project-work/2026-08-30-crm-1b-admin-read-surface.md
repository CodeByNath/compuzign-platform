# CRM-1B — Admin Station read-only Request surface

## Status
- **READY FOR CLAUDE — correction on review branch only.**
- Production base: `main@08befad05a6c9c56da12fdf692641a6c6c055185`.
- Review head audited: `c5705f3976a4f712cd4cec2f7e506ddd9d52d5d9` = exactly 1 commit ahead / 0 behind.
- Source push: **NOT APPROVED**.
- Auditor verdict: **Proceed with safeguards**.

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
