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

`contact` (Overview's "Mark as Contact Us" checkbox) is an explicit override, not a resolution outcome: `projectTierRateSheetWith()` threads it into `evaluateTierPricing()`'s `contact` mode, nulling the total while rows/inclusions still resolve normally. Every occupant-price call site passes it through; admin's live preview draft-prefers it like `rate_sheet_id`.

An occupant carries `is_addon` and Overview-owned `audience_group`
(`personal_business` by default, or `enterprise`). It may also carry
independently lifecycled `tier_editions[]` children with their own `CZTE`.
Editions never own or override customer grouping. See [Tier Add-on
Selection](tier-addon.md) and [Tier Edition](tier-edition.md).

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

`useTierInstances.ts`/`tierInstanceModel.ts` own instance and assignment
operations. `usePackageTierWorkspace.ts` resolves the selected Family's exact
assignment; `PackageTierWorkspace.tsx` owns transient focus. `TierLowerDeck.tsx`
presents Details/Connections/Settings. `TierDrawerHost.tsx` decodes occupant,
empty-slot, and registration addresses without fabricating identity. Tier
System registration remains documented in [Tier System Registration](tier-registration.md).

Family and Tier instance remain assignment-linked peers. `familySummary.ts`'s
Family card composes that edge — Tiers, Service Categories, Services,
Inclusions — from its resolved instance's occupants, identified by their
rows' `CZS`/`CZC`, never `dependents`
(`npm run regression:package-family-card-scope`).

Public consumption follows exact assignments and fails closed. Rate Sheet row identity remains `(rate_sheet_id, item_id)`; `PackageRepository::projectTierInstanceForCostBuilder()` resolves price/inclusions live through it but strips both keys before responding, so neither reaches the browser.

## Drawer, state, and persistence

- [TierDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierDrawerContent.tsx) owns the locked four-group model and unpersisted Tabs/Accordion toggle.
- [useTierDrawerController.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/useTierDrawerController.ts) coordinates editing, bin travel, dialogs, and footer state without JSX.
- [TierDrawerFooter.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierDrawerFooter.tsx) is the locked dual independent-split footer: LEFT `split` (`buildTierLifecycleMenu`, Move Edition to Bin last) and RIGHT `splitForward` (`buildTierPublishMenu`), both `menuOnly`, no primary Publish button ([contract §12](../architecture/StationDrawerLifecycleContract-v1.md#12-footer-split-button-grammar)).
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) owns instance-scoped reads and mutations; a null instance performs no Tier work.
- [tierOccupants.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/tierOccupants.ts) projects occupants and resolves them back to slots.
- [PackageSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php) owns occupant compatibility and lifecycle shapes; [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) owns mutations; [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists `cz_package_station`.

Presentation calls no endpoints. New inclusion/FAQ pool items go through Service Station's public write contract.

## Related Code Maps

[Package Station](package-station.md), [Tier System Registration](tier-registration.md), [Package Manager](package-manager.md), [Rate Sheet](rate-sheet.md), [Drawer System](drawer-system.md), [Lifecycle](lifecycle-system.md), [Tier Add-on Selection](tier-addon.md), and [Tier Edition](tier-edition.md).
