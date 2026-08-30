# Package bundle service/inclusion projection parity

## Status
- **AWAITING CHATGPT REVIEW**
- Source push: pushed to review branch only, **NOT** to `main`
- Audit verdict carried over: **Proceed with safeguards**

## Objective
Fix the deployed Package Station projection defect where a Tier can report included features while the focused family, connection cards, and inclusion list resolve the same relationships as zero/empty. Claude owns implementation; ChatGPT has made no source changes.

## Live browser evidence — 2026-08-30
Read-only check at `https://compuzign.weerax.com/studio/`, Packages > Tier Workspace Engine, Focus view:

- Selected Tier: **Package Omnia Basic**, active, `$4000.00 · monthly`.
- Tier tab/detail both report **1 included feature**.
- Focused Package Family **OMNIA — Banking** reports Tiers 1 but **Service Categories 0 / Services 0 / Inclusions 0**.
- Details > Focused inclusions says **“This Tier selects no inclusions.”**
- Connections > Family Group **OMNIA — Banking** (`pcg_f72dc62213047feb`, platform `CZPGHG2ZV`) reports **Services 0**.
- Connections > Groups > **Foundation** (`rate_group_1786783430147_13`, platform `CZPRCG93HNR`) reports **Inclusions 0**.
- Settings > Family Groups repeats OMNIA **Services 0**, while KAIROS and APTOS show 5 and 3 respectively.

This reproduces browser comments 1–6 and demonstrates cross-surface disagreement for the same selected Tier/family/group.

## Required behavior
1. Trace the canonical identity/assignment chain used by **Package Omnia Basic** from Tier selection through Package Family, Family Group, Tier Group/Rate Group, Service, inclusion, and Rate Sheet row. Establish the actual root cause from source/persisted projection evidence before changing code; do not assume the defect is necessarily a legacy/local-ID mismatch.
2. Repair only the narrow authoritative projection/resolution defect that causes valid existing relationships to be dropped. Preserve current ownership: Package Station owns Family/Tier/workspace reads, assignment resolution, fixed-slot projection, connection navigation, inclusion resolution, and Rate Sheet access.
3. Render the actual selected inclusion(s) in **Details > Focused inclusions**, including the normal inclusion row content/filters, from the same resolved source used by the Tier rather than a second bespoke projection.
4. Make all derived counts agree with the canonical resolved data:
   - Tier included-features count;
   - Package Family Services and Inclusions;
   - Family Group Services in Connections and Settings;
   - Group Inclusions in Connections.
5. Do not hard-code the observed count `1`; zero must remain correct for genuinely empty records.
6. Ensure the same resolver/projection rules work for other package families and survive reload.

## Hard non-change boundary
Do not redesign or restyle the Tier Workspace, cards, tabs, filters, labels, ordering, responsive layout, or empty states. Do not change pricing, billing cadence, Rate Sheet amounts, Package/Tier/Service/Inclusion authoring semantics, persistence schemas, unrelated customer UI, Quote Builder, or existing KAIROS/APTOS data. Avoid data migration/backfill unless evidence proves persisted identity/data is invalid; if so, stop and report that evidence before expanding scope. Do not create a second resolver or presentation-owned relationship model.

## Acceptance
- Add focused regression coverage for the proven root cause and cross-surface count parity; if mixed stable/legacy identity is involved, cover that specifically rather than assuming it upfront.
- Verify existing empty-state cases remain zero and KAIROS/APTOS remain unchanged.
- Update only affected current-state Code Map(s) if responsibility/path/behavior documentation changes, and run docs link/check validation required by repository instructions.
- Report root cause, changed files, tests/contracts, exact review-branch commit SHA, deployment state, and before/after evidence in this file.
- Push implementation only to a review branch, then set **AWAITING CHATGPT REVIEW** and stop. Do not push source to `main` without explicit approval recorded here.

## Claude Report — 2026-08-30

**Root cause (confirmed against live persisted data, not code theory alone).**
Fetched the public, unauthenticated `GET /wp-json/compuzign/v1/package-builder`
endpoint against `https://compuzign.weerax.com`. OMNIA — Banking's Tier
Omnia Basic selects exactly ONE Rate Sheet row: a self-priced **Bundle**
(`bundle_id rsb_7a7e52685c3b`, `source_type: null`) that compiles 3 real
inclusion rows (Website Web-Site Revamp, Online Banking & Member Services,
Online Payment/Wire Transfer) under group `rate_group_1786783430147_13`
("Foundation" — matches the reported live evidence exactly). KAIROS and
APTOS carry zero Bundle-backed selections across every tier, which is why
only OMNIA showed the defect.

`PackageRepository::composeTierGroup()` (the ONE resolver every Family
card, Family summary panel, Settings > Family Groups, and Connections >
Family Group all read through — `tierGroupDerivations()` /
`tierGroupCompositions()`) only recognized an Inclusion via a Manager pool
`source_type === 'inclusion'` lookup keyed on the row's `source_item_id`. A
self-priced Bundle row has neither (it "stands behind itself" — see
`PackageManagerSchema::projectTierRateSheetWith()`'s existing `$selfPriced`
handling), so it was silently skipped, zeroing Services/Categories/
Inclusions for the whole Family/Group even though the Tier's own already
Bundle-aware pricing path correctly counted it as 1.

The identical gap existed client-side in `deck.ts`'s
`projectTierInclusions()` / `projectTierRateSheetGroups()` /
`projectTierRateSheet()` (all three filtered on `source_type === 'inclusion'`
alone) — the direct cause of "This Tier selects no inclusions" in Details >
Focused inclusions and 0 Inclusions in Connections > Groups > Foundation.

**Fix.** No new resolver, no schema change, no identity work.
- `PackageRepository.php::composeTierGroup()` — a self-priced row now counts
  as ONE resolved Inclusion in its own right, and Services/Categories are
  aggregated from what it actually compiles (`row.includes[]`, resolved back
  through the same row/source indexes) rather than from the combination row
  itself, which carries no Manager source of its own.
- `deck.ts` — added one shared `isInclusionSelection()` check
  (`source_type === 'inclusion' OR bundle_id` set) used by all three lane
  projections, matching the backend rule; a Bundle inclusion's category
  filter values are the union of what it compiles.
- Rebuilt `dist/js/admin-station.js` (the deck.ts fix requires it).

**Regression coverage added.**
- `tests/tier-group-composition.php` — new `ti_omnia` fixture: a Tier Group
  whose one occupant selects only a self-priced Bundle row compiling two
  ordinary rows; asserts `inclusions=1, services=2, service_categories=2`
  (previously would have been all zero) through both the canonical CZTG read
  and the batch/wall path. Existing KAIROS/APTOS/empty assertions unchanged
  and still pass.
- `scripts/package-tier-workspace-contract.ts` — a Bundle-backed
  `DeckSelection` fixture asserting it appears in Focused inclusions, carries
  the right roll-up categories, and counts toward group/sheet
  `connectedInclusions`.

**Validated:** `php tests/tier-group-composition.php`,
`php tests/tier-pricing-parity.php`, `php tests/rate-sheet-bundle.php`,
`php tests/tier-instance-schema.php`, `php tests/tier-occupant-compatibility.php`,
`php tests/active-package-contract.php`, `npm run contract:package-tier-workspace`,
`npm run contract:tier-connections`, `npm run contract:package-family-card-metrics`,
`npm run contract:tier-settings`, `npx tsc --noEmit`, `npm run build`,
`npm run docs:check` — all pass. `php tests/tier-capability-invariants.php`
fails identically on a clean `main` checkout (unrelated pre-existing route
registration assertion) — not touched, not in scope.

No Code Map changes: ownership, paths, and documented "four counts from one
walk" behavior are unchanged — this corrects an internal, undocumented
resolution gap, not architecture.

**Review branch:** `review/package-bundle-service-inclusion-projection-parity`
at commit `79a7d99c63970e61add450907282cedc2af4d664`, pushed to origin. Not
merged/pushed to `main`. Files changed: `dist/js/admin-station.js`,
`resources/ts/package-station/surface/packageTierWorkspace/deck.ts`,
`scripts/package-tier-workspace-contract.ts`,
`src/Modules/SurfacePackages/Repositories/PackageRepository.php`,
`tests/tier-group-composition.php` (all under
`wp-content/plugins/compuzign-platform/`).
