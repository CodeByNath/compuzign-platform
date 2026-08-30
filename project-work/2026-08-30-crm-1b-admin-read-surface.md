# CRM-1B — Admin Station read-only Request surface

## Status
- **AWAITING CHATGPT REVIEW** — implemented on review branch `review/crm-1b-admin-read-surface` (`c5705f39`). Not merged to `main`.
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

---

## Claude Report — implemented on review branch — 2026-08-30

Review branch `review/crm-1b-admin-read-surface`, from `main@08befad0`, pushed at `c5705f3976a4f712cd4cec2f7e506ddd9d52d5d9`. **Not merged to `main`.** No architectural conflict found — read the Station/Drawer lifecycle contract plus the Admin Station, list-system, and drawer Code Maps/source first, per the instruction; every reuse point below is generic and already supports a read-only, single-mode consumer.

### Backend

`AdminRequestsController.php`'s `listRequests()`/`getRequest()` now call `RequestRepository::findAll()`/`findByRef()` exclusively — no `get_transient`/`$wpdb` transient scan anywhere in the file. Both are explicit allow-list projections: list returns `quote_ref, platform_id, status, type, contact, company, email, submitted, item_count, total`; detail adds `phone, notes, category, items`. `view_secret_hash` is named nowhere in either projection (confirmed dynamically, including a deliberately poisoned stored snapshot). The now-obsolete River/Water `is_accepted`/`findAllAcceptedRefs()` concept is removed — CRM-1A already made every submission durable, so "accepted" no longer means anything distinct. Legacy raw `new` surfaces as `pending` through the same repository-boundary normalization CRM-1A already built.

### Admin Station surface — reused registries only

- **Navigation/destination**: `requests` nav item (order 40) + destination, same shape as Promotions/Services.
- **List**: `useRequestsCatalogue` (data source) + `RequestsCatalogueKit` (template kit) render through the shared `cz-station-list`/`cz-station-list__cell` system with Requests' own `--requests` column-template selector and `cz-requests-deck__*` cell classes — the same "add a selector, don't reuse another surface's family" rule Service/Package already follow. No `<table>`.
- **Drawer**: `request` drawer template, registered `supportedModes: ['view']` — **the first single-mode registration** in Admin Station (every other template supports `view`+`edit`). The generic `AdminStationDrawer`/`DrawerContentProps` contract already clamps a requested mode to what a template declares, so this needed no shell change; Requests simply registers no `edit` action intent. `RequestDrawerHost.tsx` renders through the shared `drawer-kit` `ReadBlock` (same card every other module uses) with no `status` and no `actions` — a plain read card, no footer, no close guard, nothing to save or block.
- CZR/quote_ref, contact/company/email, submitted, type, status, and the submitted item snapshot are the only fields shown; no post ID, meta key, or secret is exposed.

### Tests

`tests/admin-requests-durable-surface.php` (new, dynamic PHP): list/detail projections, allow-list shape exactness, the poisoned-snapshot leak check, 404, and legacy-status normalization through this exact admin boundary — deliberately omits `get_transient()`/`set_transient()` stubs, so a regression back to transient scanning would fatal, not silently pass. `scripts/requests-admin-station-surface-contract.ts` (new, source-text): registration uses the shared registries, the drawer template is view-only with no edit intent in its binding, the list uses the shared list classes with no `<table>`, the drawer content is a plain `DrawerContentProps` + `ReadBlock` consumer with no reimplemented chrome, and the backend never reads a transient.

All pass, alongside the full existing Request/identity/Category/notification suite, `tsc --noEmit`, `build`, `contract:admin-station-css`, `contract:station-tabset`, and `docs:check`. Two pre-existing failures confirmed unrelated (via `git stash`, both predate this branch): `contract:platform-identity-schema` (coined test-fixture IDs in `rate-sheet-bundle-regression.mjs`, reported in the CRM-1A rounds) and 6 `contract:admin-station-css` failures in `cz-rate-sheet-tool__*` selectors.

One flagged item, not fixed here to keep this branch's diff focused: `tests/quote-view-email-link.php` and `tests/quote-view-http-boundary.php` still fail on this branch's base (`main`) — the CRM-1A `RequestsController` constructor-DI regression already fixed on the separate, still-pending `review/quote-email-billed-item-separators` branch. Confirmed via `git stash` not caused by CRM-1B.

Updated Code Maps: `admin-station-navigation.md`, `admin-station-list-system.md`, `admin-station-drawer.md` (new `request` row + the single-mode-template note), `quote-builder.md` (the "to be rebuilt" line now says CRM-1B shipped read-only). Also updated `resources/ts/admin-station/CLAUDE.md` and `src/Modules/Admin/CLAUDE.md` (not code maps, no word budget) with the new files/validation commands.

Set to **AWAITING CHATGPT REVIEW**. Source not pushed to `main`.
