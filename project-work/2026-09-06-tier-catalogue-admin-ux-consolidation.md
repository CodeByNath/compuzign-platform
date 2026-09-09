# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW**
- Review branch: `fix/family-tier-membership-boundary` @ `9ea1d830414a32dff0588e9ad4d94d44b1a6df50`
- Branched from production `main` `8920607f`. **Not pushed to `main`.**
- Repository holds 3 branches: `main`, `Project-work-instructions`, this one.

## What was corrected
The audit root cause is confirmed and fixed at the Family-membership boundary in
`FamilyTierAdapter.tsx`. Family occupancy is now resolved once, ahead of every
audience/focus derivation:

- `filterTiersByCustomerGroup()` returns `false` for any Tier with no
  `pricing.tiers[tier.id]` entry. Absence is non-membership, never a default
  audience. Only a real entry still falls back to the unset-audience default.
- `familyOccupants` (new local) = global slots with a real entry; `normalOccupants`
  now derives from it with `is_addon !== true`, so a missing entry can no longer
  count as a normal Tier just for lacking `is_addon: true`.
- `visibleTiers` derives from `familyOccupants`, not the global vocabulary.
- `normalTiers` now requires a real entry — the same shape `PricingTiers.tsx:883`
  already applies to its own `normalTiers` (existing in-repo precedent, contract-
  locked by `tier-edition-switch-contract.ts`).

Tab eligibility and single-Tier focus were already written correctly
(`showCustomerTabs = hasPersonalBusinessTiers && hasEnterpriseTiers`,
`defaultCustomerGroup`, `singleVisibleTier`); they were being fed phantom
occupants. No change was needed to those rules once the input was corrected.

**Must remove — both done:** phantom missing occupants no longer reach any
audience/normal-Tier count; the temporary single-Tier diagnostic logging is
removed (it was live in `main`'s shipped `dist/js/cost-builder.js`; the rebuilt
bundle has zero occurrences).

**Must not substitute — honoured.** No `useEffect` auto-open, artificial click,
timeout, CSS-only tab hiding, hardcoded Family/Tier ids, or one-card fallback.
The existing synchronous focused-shell fallback is what now fires. Diff is 4
derivation lines plus comments and the diagnostic deletion.

**Must preserve — untouched:** global Tier vocabulary contract, pricing/server-
preview authority, Tier/Edition identity, Add-ons, composable Upgrade journey,
Cart, existing focused shell.

## Behavioural coverage
New `scripts/family-tier-membership-boundary-regression.mjs`
(`npm run regression:family-tier-membership-boundary`) mounts the REAL
`FamilyTierAdapter` via esbuild + happy-dom + Preact — the technique the existing
mounted regressions already use — and asserts rendered DOM (which cards exist,
whether the tab bar exists, whether the focused shell is the landing view), not
source strings. 22 checks across: PB-only single Tier; Enterprise-only single
Tier; empty opposite group; opposite group holding only Add-ons; both groups with
real primary Tiers; global Tier slots absent from the Family; and the preserved
unset-audience default.

**Reproduction evidence:** run against pre-fix `main`, 15 checks fail, including
scenario 1 reporting `focused=false gridCards=Basic` — Nath's exact one-card
landing — and the tab bar rendering for a group with no real primary card. All 22
pass on this branch. The defect is now reproducible off-live.

## Validation
- `npx tsc --noEmit`: clean.
- `npm run build`: success; `dist/js/cost-builder.js` rebuilt and committed.
- Contracts run: `package-builder-customer-tabs`, `package-builder-regression-lock`,
  `package-builder-addon-focus`, `tier-edition-switch`, `manage-build`,
  `composable-quote-cart`, `composable-recommendations-cta`,
  `composable-offer-eligibility`, `package-family-cart`, `quote-cart-addon`,
  `package-builder-bundle-inclusion-parity`, `plan-details-value-states`,
  `commercial-leg-inclusion-groups`, `commercial-leg-extension-groups`,
  `tier-addon-flow` — all pass.

## Unresolved risks / items for the auditor
1. **Pre-existing broken contract, not touched.** `contract:package-builder-flow`
   fails with `ENOENT` on
   `resources/ts/components/package-builder/FullBuildDetail.tsx`. Verified it fails
   identically on `main` at `8920607f`. Out of this work item's scope — flagging
   rather than fixing. Needs its own decision.
2. **Doc accuracy, approval requested — not edited.**
   `docs/code-map/package-builder-focused-shell.md` (Family-switch state boundary)
   justifies the family-switch reset effect by saying "`visibleTiers`' own
   `audience_groups` fallback lets a same-id Tier from the new Family still pass
   the filter". That fallback is now narrower (non-occupants no longer pass), but
   the effect is still required, because a same-id Tier the NEW Family genuinely
   occupies still passes. The sentence is imprecise, not wrong in conclusion. I did
   not edit it — requesting approval before any doc change.
3. Live behaviour is still unverified by me; I have no live/WordPress access. The
   regression proves the derivation off-live, not the deployed page.
