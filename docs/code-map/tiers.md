# Tiers

## Purpose and ownership

Package Station owns Tier instances, occupants, fixed slots, overview and pricing selections, inclusions, FAQs, publish/enabled/popular state, occupant-bin travel, validation, and persistence. Service catalogue records and Service-owned pools are inputs; neither Service Station, Admin Station, nor Station Manager owns Tier configuration. Each operation resolves a `tier_instance_id` before its fixed slot; the address is `(tier_instance_id, slotId)`.

Stable surface and drawer identity is `occupant_id` (string). The resolved fixed `slotId` remains the mutation/storage address. Empty slots are not cards, and identities must not be coerced or substituted.

An occupant binds to **one** Rate Sheet via `rate_sheet_id` (edited in its overview module, with a confirm-then-clear picker). Its `rate_sheet_items` resolve within that sheet only — row identity is `(rate_sheet_id, item_id)`. Switching an already-bound occupant to a different sheet clears its selections (`PackageSchema::upsertOccupant`/`settleTierSlot`); first configuration keeps them. A legacy occupant with selections but no id defaults to `rs_primary` at read time.

## Registration and presentation

[register.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/register.ts) registers the `package-tier-workspace` data source, `tier-workspace` template kit, and `tier` drawer contract with Station Manager. Admin Station authors the string-key presentation-policy binding for the Packages destination; its shell hosts the resolved kit and drawer without acquiring Tier authority.

The workspace is Package-owned:

- [useTierInstances.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/useTierInstances.ts) owns instance/assignment collection state and their separate explicit mutations; [tierInstanceModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/tierInstanceModel.ts) holds pure list, eligibility, slot, suggestion, Rate Sheet-option, and cross-instance Rate Sheet inventory projections. Inventory Family labels join only through assignments.
- [usePackageTierWorkspace.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/usePackageTierWorkspace.ts) resolves a selected Family through its exact assignment and opens only that instance through `usePackageStation`. It loads the Package Manager read model independently so Settings can show Rate Sheets when no instance is assigned. Explicitly opened unassigned instances use a labelled direct-management mode.
- [deck.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/deck.ts) is the pure focused-Tier deck projection: inclusion selections enriched with Service categories and Rate Sheet-group connections. Category provenance affects presentation only, never Family scope.
- [PackageTierWorkspace.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/PackageTierWorkspace.tsx) owns transient slot and Focus/Grid selection. Its Focus shell always presents the five fixed slots; an unassigned Family or empty instance remains inside the same tabs, detail compartment, and lower deck instead of being replaced by a standalone empty block.
- [TierLowerDeck.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierLowerDeck.tsx) presents Details/Connections/Settings beneath the engine. [TierSystemSettings.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierSystemSettings.tsx) re-hosts explicit attach/create/remove/open, allow-list operations, and Package Manager tools; [TierRateSheetInventory.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierRateSheetInventory.tsx) shows availability/current users. Creation and assignment remain separate writes; removal uses named confirmation.
- [TierDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/TierDrawerHost.tsx) decodes either `(tier_instance_id, occupant_id)` for a real occupant or `(tier_instance_id, slotId)` for an empty fixed slot, then mounts the unchanged drawer composition. Empty slots never receive a fabricated `occ_…` identity.

A Package Family and Tier instance remain independent peers. Their assignment records capability use; neither peer stores or silently mutates the other.

Public consumption follows the exact assignment edge. Missing, inactive, unknown, or ambiguous resolution fails closed without `ti_primary`, another Family, or provenance fallback. One shared manager read model preserves `(rate_sheet_id, item_id)` resolution.

## Drawer, state, and persistence

- [TierDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierDrawerContent.tsx) is the host-neutral composition.
- [useTierDrawerController.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/useTierDrawerController.ts) coordinates module editing, bin travel, dialogs, and footer state without rendering JSX.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) owns instance-scoped reads, drafts, saves, settle, status, pool operations, and bin mutations. Its second positional argument is the instance id; `null` performs no Tier read or mutation.
- [tierOccupants.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/tierOccupants.ts) projects occupants and resolves them back to slots.
- [PackageSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php) owns occupant compatibility and lifecycle shapes; [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) owns mutations; [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists `cz_package_station`.

Presentation calls no endpoints. New inclusion/FAQ pool items go through Service Station's public write contract.

## Validation

Run `php tests/tier-occupant-compatibility.php`, `php tests/tier-instance-public-projection.php`, `npm run contract:package-tier-workspace`, `npm run contract:tier-instance-tool`, `npx tsx scripts/tier-occupant-admin-contract.ts`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Package Station](package-station.md), [Package Manager](package-manager.md), [Rate Sheet](rate-sheet.md), [Drawer System](drawer-system.md), and [Lifecycle](lifecycle-system.md).
