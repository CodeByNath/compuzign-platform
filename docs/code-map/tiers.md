# Tiers

## Purpose and ownership

Package Station owns Tier instances, occupants, fixed slots, overview/pricing selections, inclusions, FAQs, publish/enabled/popular state, bin travel, validation, and persistence. Service records and pools are inputs; Service, Admin, and Station Manager own no Tier configuration. Operations address `(tier_instance_id, slotId)`.

Stable surface/drawer identity is string `occupant_id`; fixed `slotId` remains the mutation/storage address. Empty slots are not cards, and identities are never coerced or substituted.

An occupant binds to **one** Rate Sheet via overview's confirm-then-clear picker. Its rows resolve only as `(rate_sheet_id, item_id)`. Switching sheets clears existing selections (`upsertOccupant`/`settleTierSlot`); first configuration keeps them. Legacy selections without a sheet id read as `rs_primary`.

## Registration and presentation

[register.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/register.ts) registers the workspace source, `tier-workspace` kit, and `tier` drawer. Admin's string-key Packages binding hosts them without acquiring Tier authority.

The workspace is Package-owned:

- [useTierInstances.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/useTierInstances.ts) separates instance/assignment state and mutations; [tierInstanceModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/tierInstanceModel.ts) projects list, eligibility, slots (with each occupant's own label, status, and sheet binding), sheet options, and inventory. It suggests no consumer: Family labels require assignments.
- [usePackageTierWorkspace.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/usePackageTierWorkspace.ts) resolves the selected Family's exact assignment and opens only that instance. It independently loads the manager model for unassigned Settings; directly opened unassigned instances use labelled management mode.
- [deck.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/deck.ts) purely enriches focused-Tier inclusions with Service categories, and projects the Tier's connections: `projectTierRateSheet` returns the one bound sheet with its stored id/status and connected-row and inclusion counts; `projectTierRateSheetGroups` returns only groups that sheet stores, keyed `(rate_sheet_id, group_id)` and inheriting the sheet's status. Ungrouped rows and retired group ids mint no group identity. Provenance affects presentation, never Family scope.
- [PackageTierWorkspace.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/PackageTierWorkspace.tsx) owns transient slot/Focus/Grid selection. Unassigned Families get setup, not five implied records; instances show five fixed slots. Admin adapters navigate to Packages, then Package selects scope with focus/scroll/live feedback, including reselection.
- [TierLowerDeck.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierLowerDeck.tsx) presents Details/Connections/Settings. Both accordion lanes use [DeckDisclosure.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/DeckDisclosure.tsx), a local WAI-ARIA disclosure holding open state only; Connections lets each section own that state, Settings controls it. Connections has two top-level disclosures — Stations (Family Groups, Groups) and Tools (Rate Sheets): Stations opens by default, and header summaries report only counts the loaded records resolve. Each subsection summarises a connected record by its own stored id and status and dispatches a scope-specific intent: `view-family`/`edit-family` to the mature `package-family` drawer, `view-connected-group`/`edit-connected-group` and `view-connected-rate-sheet`/`edit-connected-rate-sheet` to the Tier-scoped Rate Sheet drawers. No Connections action opens the `tier` drawer, and a missing connection reports `Not configured` with disabled actions. The Settings lane has its own map: [Package Home Settings](package-settings.md).
- [TierDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/TierDrawerHost.tsx) decodes `(instance, occupant)` or empty `(instance, slot)` targets and mounts the drawer. Empty slots get guidance, never fabricated `occ_…` identity.

Family and Tier instance remain peers linked by assignment; neither stores or silently mutates the other.

Public consumption follows exact assignments. Missing, inactive, unknown, or ambiguous resolution fails closed without `ti_primary`, another Family, or provenance fallback. One manager model preserves `(rate_sheet_id, item_id)`.

## Drawer, state, and persistence

- [TierDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierDrawerContent.tsx) is the host-neutral composition.
- [useTierDrawerController.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/useTierDrawerController.ts) coordinates editing, bin travel, dialogs, and footer state without JSX.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) owns instance-scoped reads, drafts, saves, settle/status, pools, and bin mutations. Its second argument is instance id; `null` performs no Tier work.
- [tierOccupants.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/tierOccupants.ts) projects occupants and resolves them back to slots.
- [PackageSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php) owns occupant compatibility and lifecycle shapes; [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) owns mutations; [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists `cz_package_station`.

Presentation calls no endpoints. New inclusion/FAQ pool items go through Service Station's public write contract.

## Validation

Run `php tests/tier-capability-invariants.php`, `php tests/tier-occupant-compatibility.php`, `php tests/tier-instance-public-projection.php`, `npm run contract:package-tier-workspace`, `npm run contract:tier-instance-tool`, `npx tsx scripts/tier-occupant-admin-contract.ts`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Package Station](package-station.md), [Package Manager](package-manager.md), [Rate Sheet](rate-sheet.md), [Drawer System](drawer-system.md), and [Lifecycle](lifecycle-system.md).
