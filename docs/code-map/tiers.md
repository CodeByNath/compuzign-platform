# Tiers

## Purpose and ownership

Package Station owns Tier instances, occupants, fixed slots, overview and pricing selections, inclusions, FAQs, publish/enabled/popular state, occupant-bin travel, validation, and persistence. Service catalogue records and Service-owned pools are inputs; neither Service Station, Admin Station, nor Station Manager owns Tier configuration. Each operation resolves a `tier_instance_id` before its fixed slot; the address is `(tier_instance_id, slotId)`.

Stable surface and drawer identity is `occupant_id` (string). The resolved fixed `slotId` remains the mutation/storage address. Empty slots are not cards, and identities must not be coerced or substituted.

An occupant binds to **one** Rate Sheet via `rate_sheet_id` (edited in its overview module, with a confirm-then-clear picker). Its `rate_sheet_items` resolve within that sheet only — row identity is `(rate_sheet_id, item_id)`. Switching an already-bound occupant to a different sheet clears its selections (`PackageSchema::upsertOccupant`/`settleTierSlot`); first configuration keeps them. A legacy occupant with selections but no id defaults to `rs_primary` at read time.

## Registration and presentation

[register.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/register.ts) registers the `package-tier-workspace` data source, `tier-workspace` template kit, and `tier` drawer contract with Station Manager. Admin Station authors the string-key presentation-policy binding for the Packages destination; its shell hosts the resolved kit and drawer without acquiring Tier authority.

The workspace is Package-owned:

- [useTierInstances.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/useTierInstances.ts) owns instance/assignment collection state and their separate explicit mutations; [tierInstanceModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/tierInstanceModel.ts) holds pure list, eligibility, slot, suggestion, and Rate Sheet-option projections.
- [usePackageTierWorkspace.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/usePackageTierWorkspace.ts) resolves a selected Family through its exact assignment and opens only that instance through `usePackageStation`. No assignment yields the neutral no-capability state. Explicitly opened unassigned instances use a labelled direct-management mode.
- [deck.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/deck.ts) is the pure focused-Tier deck projection: inclusion selections enriched with Service categories and Rate Sheet-group connections. Category provenance affects presentation only, never Family scope.
- [PackageTierWorkspace.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/PackageTierWorkspace.tsx) owns transient Tier and Focus/Grid selection and renders Family assignment states. [TierInstancePanel.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierInstancePanel.tsx) lists, creates, opens, assigns/unassigns, configures allowed sheets, and always shows the five fixed slots.
- [TierLowerDeck.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierLowerDeck.tsx) presents the focused Tier's Details/Connections/Settings beneath the engine, scoped by the SAME selection and dispatching the SAME `onIntent` to the `tier` drawer. It adds no selector, no drawer, and no Rate Sheet editor; Settings tools with no registered contract render as unavailable.
- [TierDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/TierDrawerHost.tsx) decodes the Package-owned `(tier_instance_id, occupant_id)` routing token and mounts the unchanged drawer composition. The occupant card id itself remains `occ_…`.

A Package Family and Tier instance remain independent peers. Their assignment records capability use; neither peer stores or silently mutates the other.

## Drawer, state, and persistence

- [TierDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierDrawerContent.tsx) is the host-neutral composition.
- [useTierDrawerController.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/useTierDrawerController.ts) coordinates module editing, bin travel, dialogs, and footer state without rendering JSX.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) owns instance-scoped reads, drafts, saves, settle, status, pool operations, and bin mutations. Its second positional argument is the instance id; `null` performs no Tier read or mutation.
- [tierOccupants.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/tierOccupants.ts) projects occupants and resolves them back to slots.
- [PackageSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php) owns occupant compatibility and lifecycle shapes; [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) owns mutations; [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists `cz_package_station`.

Presentation calls no endpoints. New inclusion/FAQ pool items go through Service Station's public write contract.

## Validation

Run `php tests/tier-occupant-compatibility.php`, `npm run contract:package-tier-workspace`, `npm run contract:tier-instance-tool`, `npx tsx scripts/tier-occupant-admin-contract.ts`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Package Station](package-station.md), [Package Manager](package-manager.md), [Rate Sheet](rate-sheet.md), [Drawer System](drawer-system.md), and [Lifecycle](lifecycle-system.md).
