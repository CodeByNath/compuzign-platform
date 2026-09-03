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
unaffected. It reuses `TierDetailPanel` (the same created/empty-slot
branches a fixed Tier gets, plus an additive `isSubordinate` prop — default
`false`, every other caller unaffected) and the existing `dispatchTierIntent`
path. The composable slot itself is built by `projection.ts`'s
`projectComposableWorkspaceSlot()`, exported alongside
`projectWorkspaceTierSlots()` rather than inlined in the hook. Originally
rendered as one always-visible box outside the Focus/Grid switch; see "Admin
UX restructuring" below for Focus view's current tab-based presentation
(Grid view still renders that original box unchanged).

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

Live browser validation of the above found one more leak: the shared drawer
shell's static per-template `title: 'Package Tier'`
(`register.ts`/`AdminStationDrawer.tsx`) rendered even with the composable
occupant open. Fixed with an optional `setHeaderTitle` seam on
`DrawerContentProps`/`EntityDrawerHostBridge` (mirrors `setHeaderHidden`/
`setHeaderAction`; `null` falls back to the template's own title), driven by
`vocabulary.ts`'s `resolveTierDrawerHeaderTitle(editingTierId)`. Every other
drawer template is unaffected.

## Routing-layer gaps closed

Two gaps, neither specific to this surface, had blocked reusing
`dispatchTierIntent` for the composable occupant: `resolveOccupantSlot()`
scanned only `station.tiers` for an `occupant_id` (same class of gap already
fixed PHP-side for `PackageRepository`) — now `tierOccupants.ts`'s exported
`resolveOccupantSlotIncludingComposable()`, which also checks
`composable_occupant.occupant_id`. `tierDrawerTypes.ts`'s `FIXED_TIER_SLOTS`
rejected the sentinel, blocking an uncreated composable occupant from
opening by slot address; it now accepts it too. Both are exercised directly
by `composable-occupant-workspace-contract.ts`.

## Admin UX restructuring — a sixth tab/filter destination, not a static box

**Not yet live-validated.** Implements
`project-work/2026-09-03-composable-tier-admin-to-customer-validation.md`.
Focus view's `TierNavigation.tsx` takes an optional `composableSlot`,
appended after every filtered Tier tab behind a divider, dashed-bordered so
it never reads as a sixth peer Tier — replacing Focus view's former
always-visible box below the layout (Grid view, with no tab strip, keeps
that box unchanged). Selecting it sets `selectedSlotId` to
`COMPOSABLE_TIER_ID`, never joining `slots`/the Tiers-Add-ons filter; the
derived `focusedSlot` is what every lower-deck/Connections/Details
dispatcher now reads, so the focused occupant reuses `TierDetailPanel` and
`TierLowerDeck` exactly as a normal Tier — zero forked component. This
required widening `tierInclusionDrawerTypes.ts`'s and
`tierRateSheetDrawerTypes.ts`'s own local slot-id sets to accept the
sentinel, the same gap class Phase 1C closed for `tierDrawerTypes.ts`.

A composable-only middle shell (`TierComposableMiddleShell.tsx`) mounts
between the focus area and the lower deck only while the tab is focused and
published. Left: up to 6 offered `customer_policy` items with a real deck
inclusion, featured/default-selected first. Right: stat counts (required,
Add/Remove, default-selected, adjustable-quantity, Featured) via the shared
`StationMetricBlock`, plus a Customer Options action reusing the existing
dispatcher/drawer unchanged. Both are pure functions in
`composableMiddleShell.ts` reading only the already-projected `TierDeck` and
settled `customer_policy` (now on `WorkspaceTierSlot.customerPolicy`, `null`
for every normal slot) — no second read, no new endpoint. See
`scripts/composable-tier-admin-ux-contract.ts`.

## Related Code Maps

[Composable Tier Occupant Admin UI](tier-composable-occupant-admin-ui.md),
[Composable Tier Occupant](tier-composable-occupant.md), [Composable Tier
Occupant — Admin Customer Selection Rules](tier-composable-occupant-admin-customer-policy.md),
[Tiers](tiers.md), [Drawer System](drawer-system.md), and [Package
Station](package-station.md).
