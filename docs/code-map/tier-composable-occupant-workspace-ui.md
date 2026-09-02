# Composable Tier Occupant — Tier Workspace UI

**Phase 1C — full reuse via sentinel routing; partially browser-verified.**
See [Composable Tier Occupant Admin UI](tier-composable-occupant-admin-ui.md)
for the Service-scoped drawer route (Phase 1B) this surface is a second,
independent entry point over — same backend/sentinel-routing foundation,
different presentation tree. Verified by `tsc`/`build`/
`composable-occupant-workspace-contract.ts`. Live production screenshots
confirmed the launcher, five-slot separation, and subordinate presentation;
one drawer-chrome leak found live (see below) is fixed but not yet
re-verified live.

Phase 1B's launcher only reached the Service-scoped Connections route. A
live check on the Family-first route (Settings → Family Groups → View →
Connections → Manage Tier system) found none — it resolves to the separate,
pre-existing `presentation/package-tier-workspace/` surface, untouched by
Phase 1B. This document covers what was added there.

## The workspace's own launcher

`presentation/package-tier-workspace/` reads the same `usePackageStation`
instance data `TierDrawerContent.tsx` does. `usePackageTierWorkspace.ts`
also reads `pkg.tierView(COMPOSABLE_TIER_ID)`, exposed as a new
`composableOccupant: WorkspaceTierSlot | null` field on
`PackageTierWorkspaceTool` — never entering `slots`/
`projectWorkspaceTierSlots()`/`occupants`, so "N of 5"/Family "Tiers 5" are
unaffected. `PackageTierWorkspace.tsx` renders it once, outside the
Focus/Grid switch (so both view modes cover it), reusing `TierDetailPanel`
(the same created/empty-slot branches a fixed Tier gets, plus an additive
`isSubordinate` prop — default `false`, every other caller unaffected) and
the existing `dispatchTierIntent` path. The composable slot itself is built
by `projection.ts`'s `projectComposableWorkspaceSlot()`, exported alongside
`projectWorkspaceTierSlots()` rather than inlined in the hook.

## Subordinate presentation (not just routing)

`isSubordinate` swaps every peer-Tier-sounding surface, not just the
launcher's own label: `TierDetailPanel`'s empty-state heading/body
(extracted as `subordinateEmptyStateCopy()`, never "This Tier"/"Tier slot")
and `toTierOccupantCard()`'s own additive `isSubordinate` param (`kind:
'Composable occupant'` instead of `'Package Tier'`/`'Package Add-on'`,
`PackagesIcon` instead of the Tier glyph) for the created-occupant card —
both extracted so the contract can assert the composable occupant never
presents as a normal Tier/Add-on in either state, while every existing
Tier/Add-on caller of both functions stays unchanged.

Live browser validation of the above found one more leak these functions
don't cover: the shared drawer shell's own chrome. `register.ts` registers
one static `title: 'Package Tier'` per drawer template
(`AdminStationDrawer.tsx` renders `template.title`), right for a normal
Tier but wrong once the composable occupant is open. Added an optional
`setHeaderTitle` seam to `DrawerContentProps`/`EntityDrawerHostBridge`,
mirroring the existing `setHeaderHidden`/`setHeaderAction` pattern exactly
(shell-owned state, guaranteed-reset on template/record change, `null`
falls back to the template's own title). `TierDrawerContent.tsx` calls the
new exported `vocabulary.ts` function
`resolveTierDrawerHeaderTitle(editingTierId)` in an effect keyed on
`editingTierId`, overriding only while the composable occupant is open.
Every other drawer template (Family, Rate Sheet, …) never calls the new
bridge method, so its own registered title is unaffected.

## Routing-layer gaps closed

Two gaps, neither specific to this surface, had blocked reusing
`dispatchTierIntent` for the composable occupant: `usePackageStation.ts`'s
`resolveOccupantSlot()` scanned only `station.tiers` for an `occupant_id` —
the same class of gap already fixed PHP-side for `PackageRepository`. The
lookup is now `tierOccupants.ts`'s exported
`resolveOccupantSlotIncludingComposable()`, which also checks
`composable_occupant.occupant_id`, returning `COMPOSABLE_TIER_ID`.
`tierDrawerTypes.ts`'s `FIXED_TIER_SLOTS` (the empty-slot routing token's
own validation, distinct from `TIER_KEYS`) rejected the sentinel, blocking
an as-yet-uncreated composable occupant from opening by slot address; it
now accepts it too. Both extractions exist so
`composable-occupant-workspace-contract.ts` can exercise them directly,
alongside the workspace's own structural five-slot-exclusion proof and the
drawer-header-title proof above.

## Related Code Maps

[Composable Tier Occupant Admin UI](tier-composable-occupant-admin-ui.md),
[Composable Tier Occupant](tier-composable-occupant.md), [Tiers](tiers.md),
[Drawer System](drawer-system.md), and [Package Station](package-station.md).
