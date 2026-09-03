# Composable Tier — Admin → customer browser handoff

## Status
- **AWAITING CHATGPT REVIEW — inclusion-boundary fix pushed to review branch only.**
- Auditor verdict (prior round): **Stop — architectural risk.**
- Production `main@8ff4eff90129f15f8140858d21cb923dd2f5d549`; deploy #934 succeeded. Unchanged — nothing pushed to `main` this round.
- Fix commit `af5a605dbfcc326df9a20ef1266edad7da639bc5` on `review/composable-tier-admin-customer-policy` (local only; not yet pushed to origin — needs Nath's go-ahead per shared-branch push rule before it reaches `origin`).

## Live evidence
KAIROS Build Your Own was configured/published through the normal occupant flow using existing `KAIROS-IaaS` data:
- 2 vCPU ×1
- Block Storage ×100
- Backup Storage — BaaS ×50
- Default Leg Recurring / Monthly / indefinite; headline $48.50 monthly.

Family remains Tiers 5; composable card is Active; Customer Options appears only there.

Opening Customer Options correctly opens the separate Customer Selection Rules drawer, but Edit shows **45 Rate Sheet rows** instead of the occupant's **3 selected inclusion rows**. No policy was saved; customer `/pricing/` validation stopped.

## Required correction
Customer Options must read the **current composable occupant selection identities**, not the bound Rate Sheet catalogue.

Expected rows are exactly the occupant-owned selections above. The Rate Sheet remains upstream catalogue authority but is never the Customer Options row source.

Claude must:
- derive policy rows from persisted `rate_sheet_selections`/occupant inclusion identities only;
- use Rate Sheet resolution only to enrich those selected identities with labels/pricing metadata;
- reject policy item IDs that are stale, foreign, unselected, or merely available on the Rate Sheet;
- ensure removing an inclusion from the occupant makes its prior policy invalid/non-public safely;
- preserve valid policy draft save/reopen;
- keep Customer Options separate from the normal four-module occupant editor.

Add a contract with a Rate Sheet containing many rows but an occupant selecting exactly three; the policy drawer and server validation must expose/accept only those three.

## Approved follow-up direction — NOT the bug fix
Nath wants the normal Build Your Own inclusion setup eventually to support two convenient authoring choices:
1. **Select inclusions** — current granular selection.
2. **Import all current Rate Sheet inclusions** — bulk-select every eligible row into the occupant.

Important safeguard: “Import all” must be a **snapshot/bulk selection into the occupant**, not a persistent wildcard binding. Future Rate Sheet additions must not silently become occupant/customer offerings. Once imported, the occupant owns the explicit selected identities and Admin may remove/edit them normally. Customer Options still sees only occupant-owned selections.

Do not implement this bulk-import enhancement in the current correction unless the inclusion-boundary fix genuinely requires the same primitive. Record a proposed smallest follow-up after the bug is corrected.

## Non-change boundary
No Rate Sheet mutation, new pricing/Legs, normal Tier/Add-on changes, cart/quote/Request/PDF/email/promotions/TCV work, fake data or REST/DevTools bypass. Held to exactly: only the two files below changed, plus the rebuilt bundle.

## Fix delivered — 2026-09-03
Root cause: `useTierCustomerPolicyDrawerController.ts` sourced rows through `buildRateSheetCatalogue(pkg.service, detail.rate_sheet_id, detail.rate_sheet_selections)`. That builder (`tierDetailModel.ts`) exists for the Tier Features "Add from Rate Sheet…" picker — it returns every row of the BOUND sheet and only *appends* any `existingSelections` missing from that full list; it never filters down to selections. Passing it the occupant's 3 selections therefore still returned all 45 bound-sheet rows.

Fix: the controller now reads `detail.rate_sheet_selections` directly (filtered to `resolved`) — this is already the occupant's own persisted `rate_sheet_items`, resolved 1:1 by `usePackageStation.buildTierViewFromSlot`. No second lookup, no catalogue expansion. `buildRateSheetCatalogue` is no longer imported by this controller.

Backend: `PackageManagerSchema::validateCustomerPolicyAgainstContainer()` was already correct — it validates a save against `$container['rate_sheet_items']` (the occupant's own current selections), so a dangling/foreign/unselected item_id was already rejected pre-fix. No backend change made.

Removal-safety requirement verified structurally (no code change needed): `resolveCustomerComposableSelection()` iterates `$sourceRows` (the container's *current* `rate_sheet_items`) and looks up policy by `item_id` — a policy entry whose item is no longer in the occupant's live selections is simply never visited, so it can never resolve into the public/customer projection. One residual, pre-existing, out-of-scope-for-this-fix nuance for the auditor's attention: if Admin removes an inclusion and *later re-adds the identical `item_id`* (same Rate Sheet row), the old inert policy entry for that id — never purged from storage, only excluded from resolution while absent — reactivates automatically without Admin revisiting Customer Selection Rules. Flagging, not fixing; no evidence this can happen accidentally (`item_id` identity requires the same catalogue row).

**Files changed:**
- `resources/ts/package-station/drawer/customerPolicy/useTierCustomerPolicyDrawerController.ts` — row source fix (drop `buildRateSheetCatalogue` import/call, read `detail.rate_sheet_selections` directly).
- `scripts/tier-customer-policy-drawer-contract.ts` — item 4's assertion previously string-matched the buggy call signature (`buildRateSheetCatalogue(pkg.service, detail.rate_sheet_id, detail.rate_sheet_selections)`) and would have kept passing right through this exact bug. Replaced with: (a) asserts the controller no longer calls `buildRateSheetCatalogue(`, (b) asserts it filters `detail.rate_sheet_selections` directly, (c) pins `buildRateSheetCatalogue`'s own append-only shape in `tierDetailModel.ts` as a regression guard against reintroducing the same mistake.
- `dist/js/admin-station.js` — rebuilt (`npm run build`).

**Verified (all pass):** `npm run contract:tier-customer-policy-drawer`, `npm run contract:tier-customer-policy-draft`, `php tests/composable-customer-policy-admin-surface.php`, `php tests/composable-customer-policy-resolver.php`, `npx tsc --noEmit`, `npm run build`, plus the wider Tier peer contract suite (`package-tier-workspace`, `tier-connections`, `tier-settings`, `tier-system-drawer`, `tier-instance-scope`, `tier-instance-tool`, `tier-overview-is-addon`, `tier-edition-admin`, `tier-edition-switch`, `tier-lifecycle-menu`, `supported-action-footer`). No live/browser validation performed — no production data changed and KAIROS's occupant/policy state is unchanged from the auditor's own live evidence above; a fresh live check against the same KAIROS occupant (expect exactly 3 rows now, not 45) is the natural verification once approved.

**Unresolved risk:** the stale-item-id reactivation nuance above. Not addressed because it is not what broke customer validation and the work file's non-change boundary does not call for it; flagging for a decision on whether a future round should purge (not just ignore) a policy entry whose item_id leaves `rate_sheet_items`.

## Proposed smallest follow-up — snapshot bulk-import (not implemented)
Smallest primitive: one Admin action on the occupant's inclusion editor, "Import all Rate Sheet inclusions", that reads the bound sheet's current eligible rows ONCE and calls the existing `saveTierFeatures`/`rate_sheet_items` write with those rows appended (client-side snapshot at click-time — literally `buildRateSheetCatalogue(...)`'s own full-catalogue output, filtered to `resolved`, minus rows already selected). No new endpoint, no new field, no wildcard/`"*"` marker persisted — the occupant's stored `rate_sheet_items` ends up holding the same explicit per-row identities a fully-manual selection would have produced, so Customer Options' fixed behavior above needs no special-casing for it. A later Rate Sheet addition is invisible to the occupant until Admin re-runs the action (or selects it manually), matching the required safeguard. Not started; awaiting this round's approval before scoping further.

## Claude next action
Awaiting ChatGPT auditor review of this exact commit/diff. Do not push `review/composable-tier-admin-customer-policy` to `origin` or touch `main` until Nath approves the push and the auditor's verdict is recorded here.