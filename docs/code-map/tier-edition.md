# Tier Edition

## Purpose and ownership

A Tier occupant's own existing declaration — Rate Sheet binding, selected
rows, price, billing cycle, inclusions, FAQs — is the **permanent Default**,
uses the occupant's own `CZT`, and never becomes a `tier_editions[]` row. A
Tier Edition exists only when an administrator registers an **additional**,
alternate commercial declaration for that same occupant — e.g. Monthly vs
Annual. Not another Tier, Add-on, or `TIER_MODULES` entry: an independently
addressed, independently lifecycled child record inside
`current_occupant.tier_editions[]`, carrying its own `CZTE` and [shared
`StationLifecycle`](../architecture/StationDrawerLifecycleContract-v1.md)
state. The occupant is always the one public Tier.

Each Edition carries `id`, `edition_platform_id`, `title`,
`admin_description`, lifecycle fields, one consolidated `overview` module,
`rate_sheet_id`/`rate_sheet_items` (same
switch-clears-selections rule as the occupant's binding),
`price`/`contact`/`billing_cycle`/`minimum_term_value`/`minimum_term_unit`,
and `inclusions_override`/`faq_refs` (empty inherits the occupant's).

There is no default-Edition pointer — an earlier `default_edition_id` field
let an Edition *replace* the occupant's terms, inverting the model, and was
removed. The occupant's own fields are always Default; every Edition is
always an alternate.

## Overview registration

Overview under Details carries one small derived read field, "Editions" —
`1` plus however many rows `tier_editions[]` holds, never persisted
separately. Creation happens only through "+ Edition" (see Admin editing) —
Overview collects no title/price/lifecycle action.

## Identity

`CZTE` uses an **occupant-qualified**, not slot-qualified, native reference
— `PackagePlatformNativeReference::tierEdition($tierInstanceId, $occupantId,
$editionId)`, mirroring `tierOccupant()`. Assigned on first Active via the
same reserve → persist → bind sequence `CZT`/`CZTA` use. Admin/audit only —
never public or in the cart.

## Lifecycle and cascade

Full `StationLifecycle` vocabulary via one generic `PATCH .../status`
endpoint (engine transition + Disable/Enable mask), Package Family's shape.
Guarded permanent delete requires trashed status only — no default-Edition
guard, since Default is never a `tier_editions[]` row. Parent-to-child
cascade reuses per-Edition transition functions verbatim;
`cascaded_edition_ids` scopes a later Tier-level trash/restore to only the
ids that same archive carried; restore lands `disabled`, never `active`.
Cascade reads only `tier_editions[]`, so a binned Edition (below) is
invisible to it.

## Edition bin (Phase 6)

`current_occupant.tier_edition_bin[]` mirrors `occupant_bin`'s
archive/restore/trash/delete shape one level deeper, but is **decoupled**
from `/status`: moving requires the Edition already `archived`/`trashed` and
never changes `platform_status`. A bin entry holds only `bin_id`/`edition`
(full row, with `CZTE`)/`status`/`displaced_at` — none of `occupant_bin`'s
origin/retarget/cascade metadata.

`tier_editions[]` numbering is array-derived; moving out compacts it, and
restore always appends to the end (no swap/retarget), reusing
`restoreTierEdition()` — lands `disabled`, never `active`.
`trashTierEditionBinEntry()`/`deleteTierEditionBinEntry()` mirror
`trashBinnedOccupant()`/`deleteBinnedOccupant()`. Cascade never reaches a
binned Edition — it stays binned through a parent restore.
`PackageRepository`'s identity lookups and `upsertOccupant()`'s
verbatim-preservation cover `tier_edition_bin[]` too.

## Public projection and Cost Builder

`publicTierEditionOptions()` (Active only, no `edition_platform_id`/"default"
flag) feeds `edition_options`, empty for every Tier that never used this
capability. `extractTierForCostBuilder()` always resolves the occupant's own
terms as primary. `PricingTiers.tsx` renders the switch once **one** Edition
exists — always-present Default plus Edition buttons. `ServiceCard.tsx`
captures whichever declaration was showing at the click.

## Cart and request

`QuoteItem`/`RequestSchema::sanitizeItems()` carry only structured
`minimumTermValue`/`minimumTermUnit`. No Edition identity in cart/request.

## Admin editing

`useTierEditions.ts` owns eleven endpoints (create, module draft/settle/
revert, status, restore, guarded delete,
`moveToBin`/`restoreFromBin`/`trashBinEntry`/`deleteBinEntry`) and
Edition-scoped state including `tier_edition_bin[]`. The Included-Features
module is titled **Default Tier Inclusions**.
`TierEditionDeclarationSwitcher.tsx` is the Options group's content, gated
on a real occupant: a `[Edition 2] [Edition 3]` child-chip strip
(`ChildChipStrip`) and the Edition bin UI. Default is never a row of this
strip. "+ Edition" lives in the drawer's own nav chrome, reachable only
while Options is active.

The selected Edition's read surface is two module cards
(`TIER_EDITION_ENTITY`'s `overview`/`inclusions` shells, one `ModuleState`).
Either card's Edit opens one shared `TierEditionEditor.tsx`: two tabs over
the SAME draft, one Save, one Cancel.

The selected id lives in `useTierDrawerController.ts`, not local state,
since `TierDrawerContent.tsx` unmounts its child tree while
`!pkg.detailLoaded`, which would otherwise reset the selection.

Lifecycle actions live in the ONE pinned `TierDrawerFooter`'s two
independent splits: LEFT (`buildTierLifecycleMenu` — Disable/Enable/Archive/
Trash/Restore/Move to Bin), RIGHT (`buildTierPublishMenu` — Publish
Edition/Publish Tier), both scoping Edition before Tier. Each label only
opens its own menu (`menuOnly`) — every transition is a scoped row.

## Authoritative implementation

| Area | Files |
|---|---|
| Identity | `PlatformIdentifierPolicy.php`, `PackagePlatformNativeReference.php`, `PackagePlatformIdentifierAdapters.php`, `PackageRepository.php` (`tierEdition*`, edition-bin-aware) |
| Schema/lifecycle | `PackageSchema.php` — `SECTION: TIER_EDITION`, `SECTION: TIER_EDITION_BIN` |
| REST | `PackageStationController.php` — `tierEditionContext()`, `createTierEdition`, `saveTierEditionModule`, `settleTierEditionModule`, `revertTierEditionModule`, `updateTierEditionStatus`, `restoreTierEditionEndpoint`, `deleteTierEditionEndpoint`, `tierEditionBinContext()`, `moveTierEditionToBinEndpoint`, `restoreTierEditionFromBinEndpoint`, `trashTierEditionBinEntryEndpoint`, `deleteTierEditionBinEntryEndpoint` |
| Public projection | `PricingBuilder.php` |
| Cart/request | `RequestSchema.php` |
| Admin frontend | `types.ts`, `api.ts`, `useTierEditions.ts`, `tier.tsx`, `tierEdition.tsx`, `tierEditionDetailModel.ts`, `tierEditionModel.ts`, `tierLifecycleMenu.ts`, `useTierDrawerController.ts`, `TierEditionDeclarationSwitcher.tsx`, `TierEditionEditor.tsx`, `TierEditionOverviewFields.tsx`, `TierDrawerContent.tsx`, `TierDrawerFooter.tsx` |
| Public frontend | `cost-builder.ts`, `PricingTiers.tsx`, `ServiceCard.tsx` |

## Related Code Maps

[Tiers](tiers.md), [Tier Add-on Selection](tier-addon.md), [Rate Sheet](rate-sheet.md), [Platform Identifier Station](platform-identifier-station.md), [Cost Builder](cost-builder.md), and [Quote Builder](quote-builder.md).
