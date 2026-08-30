# CRM-1B — Admin Station read-only Request surface

## Status
- **READY FOR CLAUDE**
- Production base: `main@08befad05a6c9c56da12fdf692641a6c6c055185`.
- Auditor verdict: **Proceed with safeguards**.
- CRM-1A is closed; do not reopen its identity/concurrency architecture.

## Locked scope
Build the smallest **read-only** CRM Request surface in Admin Station. No Approve/Cancel, no contact action, no new lifecycle states, no pricing/re-resolution, no backfill, no mutation of Request snapshots.

Durable `RequestRepository` is the authority. The 7-day `cz_quote_*` transient must not drive the CRM list/detail anymore.

### Required backend behavior
- Existing authenticated Admin Request list/detail routes must read durable `RequestRepository` records.
- List projects only CRM-safe fields needed by the UI: native/request reference, `CZR`, lifecycle status, request type, submitted timestamp, contact/company/email, and concise item/count/value summary where already available from the stored snapshot.
- Detail returns the stored durable submitted snapshot plus CRM identity/status projection; never return `view_secret_hash`, bearer secret, or transient security plumbing.
- Keep `quote_ref` customer-facing and `CZR` internal/admin-facing.
- Legacy raw `new` continues to surface as normalized `pending` through the repository boundary.

### Required Admin Station behavior
Before editing, read the Station/Drawer lifecycle contract plus Admin Station, list-system and drawer Code Maps/source. Reuse the established Admin Station navigation/list/drawer systems; do not build a parallel table, modal, resolver, notification, or state system.

Add a Requests destination to the existing Admin Station navigation/resolver. Minimum surface:
- Request list using the shared Admin Station list/table language;
- clear `CZR`, quote/request reference, customer/company, submitted time, type and status;
- row opens a read-only Request detail drawer using the existing drawer lifecycle/chrome;
- detail shows the submitted contact data and immutable quoted/request snapshot in a useful readable layout;
- no mutation controls in CRM-1B.

Do not expose WordPress implementation details, raw post IDs, raw meta keys, or secrets.

## Validation
Add focused contracts proving durable routes no longer enumerate/read quote transients, identity/status projection is present, sensitive secret fields cannot leak, navigation resolves Requests, and list/detail use the established Station systems. Run relevant PHP/TS contracts, `npx tsc --noEmit`, build and `docs:check`. Update affected Code Maps only where current responsibility/path changes.

## Claude action
Implement CRM-1B on a review branch from the exact production base. Keep scope surgical. If current Admin Station architecture materially conflicts with this plan, stop before implementing and report the mismatch here. Otherwise implement, push the review branch only, record exact changed files/tests/SHA, set **AWAITING CHATGPT REVIEW**, and stop. Do not push to `main`.

## Live acceptance after deployment
Admin Station must show the durable Request created by the accepted CRM-1A browser submission, including `pending` + `CZR`; opening it must show the stored submitted snapshot read-only with no secret/security plumbing. Existing customer quote/view/print flow must remain unchanged.
