# Tiers

**Locked drawer architecture adopted; Package occupant lifecycle preserved.**

## Purpose and ownership

Package Station owns Tier instances, occupants, slots, overview/pricing selections, inclusions, FAQs, publish/enabled/popular state, bin travel, validation, and persistence. Service records and pools are inputs; Service, Admin, and Station Manager own no Tier configuration. Operations address `(tier_instance_id, slotId)`.

Stable surface/drawer identity is string `occupant_id`; fixed `slotId` remains the mutation/storage address. Empty slots are not cards; identities are never coerced or substituted.

Permanent identity uses `(tier_instance_id, occupant_id)`. First occupant
settlement assigns primary `tier/CZT`; first settlement with `is_addon: true`
also assigns secondary `tier_addon/CZTA`. Both stored scalars travel with the
whole occupant through archive, restore, swap, retarget, and slot movement.
Dormant `CZTA` is preserved and reused. Only permanent deletion tombstones
either binding.

An occupant binds to **one** Rate Sheet via overview's confirm-then-clear picker; its rows resolve only as `(rate_sheet_id, item_id)`. Switching sheets clears selections (`upsertOccupant`/`settleTierSlot`); first configuration keeps them. Legacy selections without a sheet id read as `rs_primary`.

An occupant also carries `is_addon` — see [Tier Add-on Selection](tier-addon.md).

## Registration and presentation

[register.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/register.ts) registers the workspace source, `tier-workspace` kit, and `tier` drawer. Admin's string-key Packages binding hosts them without acquiring Tier authority.

The workspace is Package-owned:

- [useTierInstances.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/useTierInstances.ts) separates instance/assignment state and mutations; [tierInstanceModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/tierInstanceModel.ts) projects list, eligibility, slots, sheet options, and inventory. It suggests no consumer: Family labels require assignments.
- [usePackageTierWorkspace.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/usePackageTierWorkspace.ts) resolves the selected Family's exact assignment and opens only that instance. Directly opened unassigned instances use labelled management mode.
- [deck.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/deck.ts) enriches focused-Tier inclusions with Service categories and projects the Tier's connections: `projectTierRateSheet` returns the one bound sheet with its stored id/status and row counts; `projectTierRateSheetGroups` returns only groups that sheet stores, keyed `(rate_sheet_id, group_id)` and inheriting its status. Ungrouped rows and retired group ids mint no group identity.
- [PackageTierWorkspace.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/PackageTierWorkspace.tsx) owns transient slot/Focus/Grid selection. A Family holding no Tier system keeps its honest setup surface and registers one directly from there, handing its own id over to be pre-selected rather than relaying the user to Settings. Admin adapters navigate to Packages, then Package selects scope with focus/scroll/live feedback.
- [TierLowerDeck.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierLowerDeck.tsx) presents Details/Connections/Settings through Package's `TierTabSet` skin over Admin's accessible `StationTabSet`. Connections preserves stored identity and owning routes; Settings remains read/launcher-only. See [Package Home Settings](package-settings.md).
- [TierDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/TierDrawerHost.tsx) decodes `(instance, occupant)`, empty `(instance, slot)`, or the registration address, and mounts the drawer. An empty slot opens the ordinary readable Overview screen — no explanation block and no opened editor: its empty Tier Overview module carries the Pending pill, that pill's guidance, and the Edit action into the existing editor, the cycle Included Features and Common Questions already follow. Never fabricated `occ_…` identity.
- Registering a new Tier system happens in this same drawer at `tier-register:[familyId]`, resolving into the same composition the persisted route mounts. See [Tier System Registration](tier-registration.md).

Family and Tier instance remain peers linked by assignment; neither stores or silently mutates the other.

Public consumption follows exact assignments. Missing, inactive, unknown, or ambiguous resolution fails closed without `ti_primary` or another Family. One manager model preserves `(rate_sheet_id, item_id)`.

## Drawer, state, and persistence

- [TierDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierDrawerContent.tsx) is the host-neutral composition.
- [useTierDrawerController.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/useTierDrawerController.ts) coordinates editing, bin travel, dialogs, and footer state without JSX.
- [TierDrawerFooter.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierDrawerFooter.tsx) applies the mature record lifecycle split whenever `tier-actions` is active: never-published offers Move to Trash, explicitly disabled offers Enable, otherwise Disable; Publish remains primary when content allows it, and previously published occupants retain Archive in overflow.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) owns instance-scoped reads, drafts, saves, settle/status, pools, and bin mutations. Its second argument is instance id; `null` performs no Tier work.
- [tierOccupants.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/tierOccupants.ts) projects occupants and resolves them back to slots.
- [PackageSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php) owns occupant compatibility and lifecycle shapes; [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) owns mutations; [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists `cz_package_station`.

Presentation calls no endpoints. New inclusion/FAQ pool items go through Service Station's public write contract.

## Related Code Maps

[Package Station](package-station.md), [Tier System Registration](tier-registration.md), [Package Manager](package-manager.md), [Rate Sheet](rate-sheet.md), [Drawer System](drawer-system.md), [Lifecycle](lifecycle-system.md), and [Tier Add-on Selection](tier-addon.md).
