# CRM-1B — Admin Station read-only Request surface

## Status
- **AWAITING CLAUDE RESPONSE** — one final type-contract correction only.
- Production base: `main@08befad05a6c9c56da12fdf692641a6c6c055185`.
- Review head: `56c9f0a40dd2f0b340a8a0d32492329f7c26193f` on `review/crm-1b-admin-read-surface`.
- Source push: **NOT APPROVED**.
- Auditor verdict: **Proceed with safeguards**.

## Locked CRM-1B scope
Read-only Admin Station Requests only: durable `RequestRepository` authority, authenticated list/detail, shared Station list/drawer systems, no mutation/lifecycle/pricing/backfill work. CRM-1A remains closed.

## Independent audit
The family-tier rendering correction is directionally correct and surgical. The new `requestItemDisplay()` uses only immutable stored snapshot data: `familyTitle` + Tier/Edition for `family_tier`, and preserves the legacy Service branch. `RequestDrawerHost` now renders this projection instead of assuming `serviceTitle`. No re-resolution or TCV calculation was added.

The correction commit from `c5705f39` to `56c9f0a4` touches only 6 files: the drawer, new display projection, request admin types, two focused contracts, and rebuilt dist JS.

## Final correction before push
`RequestLine` now claims to "match RequestSchema::sanitizeItems() exactly", but it still omits four fields that the authoritative sanitizer persists on both branches:
- `promotion_id: string`
- `billing_label: string`
- `minimumTermValue: number | null`
- `minimumTermUnit: string | null`

This is a type-contract mismatch, not a UI redesign. Do not change runtime payloads or rendering behavior.

### Claude next action
On the same review branch only:
1. Add those four persisted fields to `RequestLine` with the exact sanitizer nullability/types.
2. Update the misleading common-field comment so it accurately lists the stored common fields.
3. Extend the focused contract only if needed to prove type/source parity; do not widen the UI.
4. Re-run the already-scoped CRM-1B validation (`contract:requests-admin-station-surface`, relevant PHP Request test, `tsc --noEmit`, build, docs check).
5. Push the review branch, record the new SHA, set **AWAITING CHATGPT REVIEW**, and stop. Do not push to `main`.

## Live acceptance after deployment
Browser validation remains required: Requests destination appears; the CRM-1A Request shows `pending` + CZR; drawer shows contact + Package Family/Tier snapshot read-only; no secret/meta/post IDs; customer quote/view/print remains unchanged.
