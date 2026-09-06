# Composable Tier Occupant Admin UI

**Phase 1B — full reuse via sentinel routing; not yet browser-verified on
this route.** See [Composable Tier Occupant](tier-composable-occupant.md)
for the backend foundation this builds on. Verified by `tsc`/`build`/a
dedicated TS contract (`composable-occupant-address-contract.ts`); no
interactive browser check has been performed on this Service-scoped route
— see Not interactively verified below.

This document covers only the Service-scoped Connections route
(`TierDrawerContent.tsx`). The separate Family-first
`presentation/package-tier-workspace/` surface — its own launcher,
subordinate presentation, and the drawer-chrome header fix live validation
found — is [Composable Tier Occupant — Tier Workspace UI](tier-composable-occupant-workspace-ui.md).

## The sentinel-routing design

`vocabulary.ts` reserves `COMPOSABLE_TIER_ID = 'composable'` (never a
member of `TIER_KEYS`) plus `isComposableOccupant()`. Every tierId-keyed
method on `usePackageStation` (`tierView`, the four `saveTierX`,
`revertTierModule`, `settleTier`, `toggleTierEnabled`, `archiveTier`,
`restoreOccupant`) accepts this sentinel and routes to the composable
occupant's own endpoints, adapting each response
(`composableToLifecycle()`/`composableToArchive()`/`composableToRestore()`,
all exported for the contract) back into the exact shape a normal
`tiers[tierId]` response already has. `useTierEditions.ts`'s 11 mutations
do the same for this occupant's own Editions.

This is the **one place that branches** — every consumer above it
(`useTierModuleEditing`, `useTierBinTravel`, `tierDetailModel`,
`TierDrawerContent`, `TierEditionDeclarationSwitcher`, the pinned footer,
every schema-driven module editor) stays unaware a second addressing
scheme exists, since they only ever see a `tierId` string.

`restoreOccupant` resolves which occupant a `bin_id` belongs to from the
bin entry's own `origin_tier`; routed to the composable endpoint,
`mode`/`targetTier` are silently unused since that endpoint accepts
neither — swap/retarget into a normal slot is structurally unreachable.
`TierBinList.tsx` mirrors this: a composable-origin conflict shows "archive
it first, then restore," never a Swap/retarget control.

## Reused unchanged

Every existing Tier drawer/editor/lifecycle primitive is reused as-is —
`useTierModuleEditing`, `useTierBinTravel`, `useTierEditions`,
`TierEditionDeclarationSwitcher`, the pinned footer and its
`buildTierLifecycleMenu`/`buildTierPublishMenu`, the schema-driven module
editors (`TierOverviewEditor`, `TierPricingRulesEditor`,
`PoolInclusionsEditor`, `PoolFaqsEditor`), and `buildTierDetail`/
`buildTierFooterModel`/`buildRateSheetCatalogue()` in `tierDetailModel.ts`
— none forked, none touched beyond threading the sentinel through.

## Dedicated (not reused)

- `usePackageStation.ts`'s `composableToLifecycle()`/`composableToArchive()`/
  `composableToRestore()` response adapters — the shape-translation seam
  described above.
- `TierBinList.tsx`'s composable-origin conflict branch (no Swap/retarget
  UI offered).

## Admin surface

A `ReadBlock` launcher in `TierDrawerContent.tsx`'s package-overview
Details screen — after the five `tierOccupants` cards, before the Pricing
Summary table, never inside `TIER_KEYS`/`tierOccupants`/the "Current (N)"
count. Its action calls the SAME `openTierEdit()` every normal Tier card
calls, addressed at `COMPOSABLE_TIER_ID` — opening the exact same
Details/Options/Connections/Support individual-occupant screen, footer, and
Edition management (`TierEditionDeclarationSwitcher`) every normal Tier
gets, covering the full Create → Pending → Pricing Rules/Features/FAQs →
Publish → Enable/Disable → Editions path with no reduced/parallel UI.

`TierOverviewEditor` gained an additive `hideAddonAndPopular` prop (default
`false`, every caller unaffected), threaded through `bindings/tier.tsx`'s
`overview` editor render via the schema session's `extras` — the one place
the composable context suppresses invalid normal-slot concepts (Add-on,
Popular). `TierDrawerContent.tsx` sets `extras.hideAddonAndPopular` from
`isComposableOccupant(editingTierId)` when constructing the `tier-overview`
editing session.

**Phase 2 merge (project-work/2026-09-06-tier-catalogue-admin-ux-
consolidation.md):** the same `extras` seam now also threads a
`customerPolicy`/`onCustomerPolicyChange` pair into the `tier-inclusions`
editing session, so `PoolInclusionsEditor` mounts the standalone Customer
Selection Rules drawer's own per-item controls (extracted to
`drawer/editors/customerPolicyFields.tsx`, the one shared mutation/lookup
authority — no duplicated logic) once per selected inclusion `item_id`,
never per Leg assignment or Bundle child. `useTierModuleEditing.ts` seeds
this second draft only when `isComposableOccupant(editingTierId) &&
d.enabled` — never earlier than the standalone drawer's own eligibility
gate — and coordinates its save under the SAME Tier Inclusions Save click
as `featuresDraft`, via its own separate `saveTierCustomerPolicy` call and
module/draft/lifecycle; a policy-save failure still fails the whole Save.
Ordinary Tier/Add-on occupants and every Tier Edition caller never receive
this prop (`undefined`), so they render byte-identically to before this
merge. The standalone drawer ([Admin Customer Selection
Rules](tier-composable-occupant-admin-customer-policy.md)) keeps working
unchanged as a rollback/parity surface until a later phase's live
validation allows retiring it. Locked by
`scripts/tier-inclusions-customer-policy-merge-contract.ts`.

## Not interactively verified

`TierDrawerContent.tsx`/`useTierDrawerController.ts` are the locked,
historically bug-prone four-group Tier drawer — `package-station/CLAUDE.md`
documents defects (an auto-settling Save, a wrong-state bin icon, a
Remove-identity mismatch) caught only by live browser validation, not code
review or `tsc`/`build`. Proceeding without a live browser was explicitly
authorized for this round, with live validation deferred to the reviewer
after source review — see the coordination doc's Phase 1B decision.

## Related Code Maps

[Composable Tier Occupant — Tier Workspace UI](tier-composable-occupant-workspace-ui.md),
[Composable Tier Occupant](tier-composable-occupant.md), [Composable Tier
Occupant — Admin Customer Selection Rules](tier-composable-occupant-admin-customer-policy.md),
[Tiers](tiers.md), [Tier Edition](tier-edition.md), [Drawer System](drawer-system.md), and
[Package Station](package-station.md).
