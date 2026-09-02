# Composable Tier Occupant Admin UI

**Phase 1B/1C — full reuse via sentinel routing; not yet browser-verified.**
See [Composable Tier Occupant](tier-composable-occupant.md) for the backend
foundation this builds on. Verified by `tsc`/`build`/two dedicated TS
contracts (`composable-occupant-address-contract.ts`,
`composable-occupant-workspace-contract.ts`); no interactive browser check
has been performed — see Not interactively verified below.

Phase 1B's launcher only reached the Service-scoped Connections route. A
live check on the Family-first route (Settings → Family Groups → View →
Connections → Manage Tier system) found none there — it resolves to the
separate, pre-existing `presentation/package-tier-workspace/` surface,
untouched by Phase 1B. Phase 1C (below) adds the same launcher there.

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

## Phase 1C — the Tier Workspace surface's own launcher

`presentation/package-tier-workspace/` is a second, independent entry point
over the same `usePackageStation` instance data. `usePackageTierWorkspace.ts`
now also reads `pkg.tierView(COMPOSABLE_TIER_ID)`, exposed as a new
`composableOccupant: WorkspaceTierSlot | null` field on
`PackageTierWorkspaceTool` — never entering `slots`/
`projectWorkspaceTierSlots()`/`occupants`, so "N of 5"/Family "Tiers 5" are
unaffected. `PackageTierWorkspace.tsx` renders it once, outside the
Focus/Grid switch, reusing `TierDetailPanel` (the same created/empty-slot
branches a fixed Tier gets, plus an additive `isSubordinate` prop — default
`false`, every other caller unaffected — swapping its empty-state "Fixed
Tier slot" copy for wording that does not claim the composable occupant is
one) and the existing `dispatchTierIntent` path. The composable slot itself
is built by `projection.ts`'s `projectComposableWorkspaceSlot()`, exported
alongside `projectWorkspaceTierSlots()` rather than inlined in the hook.

Two routing-layer gaps, neither specific to this surface, had blocked that
dispatch: `usePackageStation.ts`'s `resolveOccupantSlot()` scanned only
`station.tiers` for an `occupant_id` — the same class of gap already fixed
PHP-side for `PackageRepository`. The lookup is now
`tierOccupants.ts`'s exported `resolveOccupantSlotIncludingComposable()`,
which also checks `composable_occupant.occupant_id`, returning
`COMPOSABLE_TIER_ID`. `tierDrawerTypes.ts`'s `FIXED_TIER_SLOTS` (the
empty-slot routing token's own validation, distinct from `TIER_KEYS`)
rejected the sentinel, blocking an as-yet-uncreated composable occupant
from opening by slot address; it now accepts it too. Both extractions exist
so `composable-occupant-workspace-contract.ts` can exercise them directly,
alongside the workspace's own structural five-slot-exclusion proof.

## Not interactively verified

`TierDrawerContent.tsx`/`useTierDrawerController.ts` are the locked,
historically bug-prone four-group Tier drawer — `package-station/CLAUDE.md`
documents defects (an auto-settling Save, a wrong-state bin icon, a
Remove-identity mismatch) caught only by live browser validation, not code
review or `tsc`/`build`. Proceeding without a live browser was explicitly
authorized for this round, with live validation deferred to the reviewer
after source review — see the coordination doc's Phase 1B decision.

## Related Code Maps

[Composable Tier Occupant](tier-composable-occupant.md), [Tiers](tiers.md),
[Tier Edition](tier-edition.md), [Drawer System](drawer-system.md), and
[Package Station](package-station.md).
