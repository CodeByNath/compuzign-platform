# Package bundle service/inclusion projection parity

## Status
- **AWAITING CHATGPT REVIEW**
- Production `main` = `f82248d605faf65f27687b0fedf5e1ee9ce5954c` (unchanged).
- Review head: `2b62f20f4f2174791fb76e6662ecca1c3ffcb9c6` on new branch `review/package-bundle-family-group-count-and-price-wording` (branched from `main@f82248d6`, 1 commit ahead).
- Source push: **NOT APPROVED**
- Auditor verdict carried over: **Proceed with safeguards — live parity remains incomplete**.

## Accepted behavior
A Bundle remains one commercial Rate Sheet selection/pricing row. Admin read/display projection expands its resolved `includes[]` into real supplied Inclusion rows; the Bundle shell is never itself an Inclusion. Service/Category provenance comes from those supplied rows. No pricing, Leg, persistence, schema, identity, authoring, or migration change.

Bundle children dedupe by authoritative `(rate_sheet_id, item_id)`. Bundle-only children are contextual/display-only: no independent price and no false Tier-Inclusion action. A genuine direct selection wins pricing and addressability regardless of array order.

## Production/deploy audit
GitHub `main` independently resolves to approved head `f82248d6`; deploy run `33303465265` succeeded for that SHA. Reviewed scope remains the reported Package Tier projection files/tests and generated bundle.

## Live browser validation — 2026-08-30
Read-only production check after reload at `https://compuzign.weerax.com/studio/`.

**Passing**
- OMNIA summary shows Categories 3 / Services 3 / Inclusions 3.
- Details renders three real Bundle-supplied rows; `Foundation Bundle` is not rendered as an Inclusion.
- Bundle-only child rows have no false View/Edit action or independent price.
- Connections > Foundation reports Inclusions 3.
- KAIROS remains Categories 6 / Services 17 / Inclusions 26; direct rows retain actions.
- Reload and OMNIA reselect preserve the projection.

**Failing**
- Connections > Family Group > OMNIA (`pcg_f72dc62213047feb`, `CZPGHG2ZV`) reports **Services 0**.
- Settings > Family Groups repeats OMNIA **Services 0**; KAIROS/APTOS remain 5/3.
- Each OMNIA Bundle-supplied inclusion displays `PRICE —`, which reads as missing/unknown rather than explaining inherited Bundle pricing.

## Next Claude instruction
### 1. Family Group counts
Make the Connections and Settings Family Group cards follow the same canonical resolved route already producing the correct **Services 3** in the selected **OMNIA — Banking summary**. Reuse that projection/selector rather than inventing a third count path. Count distinct resolved Services reached through Bundle children by stable Service identity; do not hard-code 3. Both OMNIA cards must show 3 for current production data, while genuinely empty groups remain 0.

### 2. Bundle-child price wording
In **Details > Focused inclusions**, when a row is Bundle-supplied and intentionally has no independent price, render **“Included in bundle”** in the Price value instead of `—`. This wording explains pricing provenance without implying free, unavailable, or unconfigured. Direct selections must continue showing their real formatted price. Do not assign, copy, calculate, or persist a child price.

## Hard non-change boundary and acceptance
Keep all passing behavior unchanged. Do not alter pricing calculations, Bundle commercial totals, persistence/schema, authoring, row actions, layout, labels other than this exact Price fallback, KAIROS/APTOS counts, or unrelated stations.

Add regressions proving:
- the same canonical OMNIA/service projection feeds summary plus Connections/Settings counts;
- Bundle-only price renders `Included in bundle`;
- direct priced rows are unchanged;
- genuinely empty groups remain 0.

Report root cause, changed files, tests, review SHA, and deployment state here; then set **AWAITING CHATGPT REVIEW**. Do not push source to `main` without Nath’s explicit approval.

## Claude Report — round 4 — 2026-08-30

**Root cause 1 — Family Group Services.** `projectFamilyConnectionRows()`
(`connectionNavigation.ts`) sourced `assignedServices` from
`family.dependents.services` — a genuinely different metric per
`cardAdapter.ts`'s own doc comment (what the Family's connected Services
could supply across every Rate Sheet in the station, not what its Tiers
actually compose), never the canonical `composeTierGroup()`-derived
`familyComposition` the Summary panel already read correctly. Worse,
Settings had its OWN separate, independently broken call site
(`TierSystemSettings.tsx`'s `connectedFamilyRow`) calling
`projectFamilyConnectionRows(family)` with **no composition argument at
all** — a genuine second defect, not just the same one showing twice.

**Fix 1.** Threaded the Summary panel's own `familyComposition` state
(already computed in `usePackageTierWorkspace.ts`, unchanged) through one
prop chain: `PackageTierWorkspace.tsx` → `TierLowerDeck.tsx` →
`TierSystemSettings.tsx`, and into the existing Connections path via
`projectConnectionNavigation()`. `projectFamilyConnectionRows()` now
prefers `familyComposition.services`, falling back to
`dependents.services` only when no composition is available at all
(unassigned Family, no CZTG, or not yet loaded) — never inventing a zero
for an already-working reading.

**Root cause 2 — price wording.** A Bundle-supplied row's null
`lineTotal` rendered through the plain `money()` formatter's `—` fallback
— identical to a genuinely broken/missing price, with no way to tell them
apart.

**Fix 2.** `InclusionRow` (`TierLowerDeck.tsx`) now renders "Included in
bundle" when `!inclusion.addressable`, before the existing
resolved/unresolved price branches. Direct selections are completely
unaffected (the `addressable` check gates before their branch runs).

**Regression coverage.**
- `scripts/package-tier-workspace-contract.ts`: three new cases on
  `projectConnectionNavigation()` proving `assignedServices` reads
  composition when available (3, not `dependents.services`'s 1), falls
  back correctly when composition is null, and reports a genuine 0 for an
  empty composition rather than a stale non-zero fallback.
- `scripts/tier-settings-contract.ts`: a new full-chain check proving
  `familyComposition` actually reaches Settings > Family Groups through
  every link (workspace → lower deck → settings props) — this is what
  would have caught the Settings-specific missing-argument defect before
  it shipped. Two pre-existing assertions that matched the OLD
  one-argument `projectFamilyConnectionRows(family)` call were updated to
  the new, correct two-argument signature (they'd otherwise have failed
  against the legitimate fix, not caught a regression).
- `scripts/tier-connections-contract.ts`: asserts the Price cell wording
  for a Bundle-supplied row.

**Validated:** `npx tsc --noEmit`, `npm run contract:package-tier-workspace`,
`npm run contract:tier-connections`, `npm run contract:tier-settings`,
`npm run contract:package-tier-workspace-shell`,
`npm run contract:package-family-card-metrics`,
`php tests/tier-group-composition.php` (backend untouched, still green),
`npm run build`, `npm run docs:check`, plus a repo-wide NUL-byte scan —
all pass.

**Files changed:** `dist/js/admin-station.js`,
`resources/ts/package-station/presentation/package-tier-workspace/PackageTierWorkspace.tsx`,
`resources/ts/package-station/presentation/package-tier-workspace/TierLowerDeck.tsx`,
`resources/ts/package-station/presentation/package-tier-workspace/TierSystemSettings.tsx`,
`resources/ts/package-station/surface/packageTierWorkspace/connectionNavigation.ts`,
`resources/ts/package-station/surface/packageTierWorkspace/usePackageTierWorkspace.ts`,
`scripts/package-tier-workspace-contract.ts`, `scripts/tier-connections-contract.ts`,
`scripts/tier-settings-contract.ts` (all under
`wp-content/plugins/compuzign-platform/`). No Code Map change — no
documented owner/path/responsibility changed, only a wiring defect
(composition never reached these two call sites) and a display-string
correction.
