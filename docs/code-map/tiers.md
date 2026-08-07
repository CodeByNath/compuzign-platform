# Tiers

**Locked Station/Drawer architecture: conforming Tier occupant and Tier Add-on.**

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

An occupant also carries `is_addon` — see [Tier Add-on Selection](tier-addon.md) — and may carry `tier_editions[]`, independently lifecycled child records (own `CZTE`) for additional declarations alongside the occupant's own permanent Default, e.g. Monthly vs Annual. Not a `TIER_MODULES` entry. See [Tier Edition](tier-edition.md).

## Locked creation and lifecycle

The Tier occupant uses the shared registered composition, shared drawer shell,
shared module placement, inline module editors, Save-as-draft, Pending
dim/full pills, shared notification engine, and canonical lifecycle footer.
The first successful Overview Save creates a durable Pending occupant, assigns
`occupant_id`, retains the Overview draft with `module_status.overview =
'pending'`, and hands that identity into the same mounted drawer. It assigns no
`CZT` or `CZTA`.

Publish is the settlement and activation boundary for that existing occupant:
it settles eligible drafts, activates, assigns `CZT` on first Publish, and
conditionally assigns `CZTA` on first Add-on Publish. Incomplete configuration
is Pending dim; publication-ready saved draft is Pending full; Publish is
Active; Disable is Disabled; Enable returns to Pending dim/full by readiness.
Never-published occupants offer Move to Trash; previously published occupants
retain Archive. Package Station remains the sole authority for occupant state.

Tier Group / Tier System is a separate aggregate and is not promoted by this
occupant conformance. Its registration and Publish/Apply contract remains in
[Tier System Registration](tier-registration.md).

## Registration and presentation

[register.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/register.ts) registers the workspace source, `tier-workspace` kit, and `tier` drawer. Admin's string-key Packages binding hosts them without acquiring Tier authority.

The Package-owned workspace entry points are:

- [useTierInstances.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/useTierInstances.ts) and [tierInstanceModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/tierInstanceModel.ts) own instance/assignment mutations and projections.
- [usePackageTierWorkspace.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/usePackageTierWorkspace.ts) resolves the selected Family's exact assignment; unassigned instances use labelled management mode.
- [deck.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/deck.ts) projects focused-Tier connections using stored sheet/group identities only.
- [PackageTierWorkspace.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/PackageTierWorkspace.tsx) owns transient slot/focus/grid selection.
- [TierLowerDeck.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierLowerDeck.tsx) presents Details/Connections/Settings; Settings is read/launcher-only. See [Package Home Settings](package-settings.md).
- [TierDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/TierDrawerHost.tsx) decodes occupant, empty-slot, and registration addresses. Empty slots open readable Overview with Pending guidance and Edit, never fabricated identity.
- Tier System registration uses `tier-register:[familyId]`; see [Tier System Registration](tier-registration.md).

Family and Tier instance remain peers linked by assignment; neither stores or silently mutates the other.

Public consumption follows exact assignments and fails closed. Rate Sheet row identity remains `(rate_sheet_id, item_id)`.

## Drawer, state, and persistence

- [TierDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierDrawerContent.tsx) is the host-neutral composition.
- [useTierDrawerController.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/useTierDrawerController.ts) coordinates editing, bin travel, dialogs, and footer state without JSX.
- [TierDrawerFooter.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierDrawerFooter.tsx) applies the mature record lifecycle split whenever `tier-actions` is active: never-published offers Move to Trash, explicitly disabled offers Enable, otherwise Disable; Publish remains primary when content allows it, and previously published occupants retain Archive in overflow.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) owns instance-scoped reads, drafts, saves, settle/status, pools, and bin mutations. Its second argument is instance id; `null` performs no Tier work.
- [tierOccupants.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/tierOccupants.ts) projects occupants and resolves them back to slots.
- [PackageSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php) owns occupant compatibility and lifecycle shapes; [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) owns mutations; [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists `cz_package_station`.

Presentation calls no endpoints. New inclusion/FAQ pool items go through Service Station's public write contract.

## Related Code Maps

[Package Station](package-station.md), [Tier System Registration](tier-registration.md), [Package Manager](package-manager.md), [Rate Sheet](rate-sheet.md), [Drawer System](drawer-system.md), [Lifecycle](lifecycle-system.md), [Tier Add-on Selection](tier-addon.md), and [Tier Edition](tier-edition.md).
