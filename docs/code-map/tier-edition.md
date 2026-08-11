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
removed.

`price` projects live via `projectEditionPrices()`
(`projectTierRateSheetWith()` per Edition), each row's own `contact`
threaded in independently — one Edition's "Contact Us" override (same
mechanism/field as the occupant's) never affects a sibling's price.

## Overview registration

Overview under Details carries one small derived read field, "Editions" —
`1` plus however many rows `tier_editions[]` holds, never persisted
separately. Creation happens through "+ Edition" (see Admin editing);
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
guard. Parent-to-child
cascade reuses per-Edition transition functions verbatim;
`cascaded_edition_ids` scopes a later Tier-level trash/restore to only the
ids that same archive carried; restore lands `disabled`, never `active`.
Cascade reads only `tier_editions[]`; a binned Edition is invisible to it.

## Edition bin (Phase 6)

`current_occupant.tier_edition_bin[]` mirrors `occupant_bin`'s
archive/restore/trash/delete shape one level deeper. `moveTierEditionToBin()`
requires the Edition already `archived`/`trashed` and never itself changes
`platform_status` (Admin editing below covers the atomic command built on
it). A bin entry holds only `bin_id`/`edition` (full row, with
`CZTE`)/`status`/`displaced_at` — none of `occupant_bin`'s metadata.

`tier_editions[]` numbering is array-derived; moving out compacts it, and
restore appends to the end, landing `disabled`, never `active`.
`trashTierEditionBinEntry()`/`deleteTierEditionBinEntry()` mirror
`trashBinnedOccupant()`/`deleteBinnedOccupant()`. Cascade never reaches a
binned Edition (`PackageRepository`/`upsertOccupant()` too).

## Public projection and Cost Builder

`publicTierEditionOptions()` (Active only, no `edition_platform_id`/"default"
flag) feeds `edition_options`, empty otherwise.
`extractTierForCostBuilder()` resolves the occupant's terms as primary; its
`rate_sheet_id`/`rate_sheet_items` are internal projector inputs only —
`PackageRepository::projectTierInstanceForCostBuilder()` strips both before
the tier reaches `$flatTiers`, so neither ever reaches the public response.
`PricingTiers.tsx` renders the switch once **one** Edition exists: Default
plus Edition buttons. `ServiceCard.tsx` captures the declaration shown at click.

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
(`ChildChipStrip`) with a fixed trailing Bin icon opening the Bin as its own
focused task (`TierEditionBinFocusedView.tsx`, `FocusedTaskShell`), replacing the strip
and cards. Default is never a row; "+ Edition" lives in Options navigation.

The footer's "Move Edition to Bin" command composes the Trashed transition
and relocation in one persistence operation. Permanent Delete lives only in
`TierEditionBinList.tsx` for trashed rows.

The two module cards share `TierEditionEditor.tsx`, one draft, and draft-only
Save/Cancel; Publish settles. Every read/re-edit resolves through
`useTierEditions.editionView()`, mirroring `usePackageStation.tierView()`: a
pending draft wins over settled fields, so a just-Saved Edition displays
immediately. Selection state lives in `useTierDrawerController.ts`.

`TierDrawerFooter` carries two independent splits: LEFT
(`buildTierLifecycleMenu` — Disable/Enable/Archive/Restore, Move to Bin
last), RIGHT (`buildTierPublishMenu` — Publish Edition/Tier), each opening
only its own menu (`menuOnly`).

## Authoritative implementation

| Area | Files |
|---|---|
| Identity | `PlatformIdentifierPolicy.php`, `PackagePlatformNativeReference.php`, `PackagePlatformIdentifierAdapters.php`, `PackageRepository.php` (`tierEdition*`, edition-bin-aware) |
| Schema/lifecycle | `PackageSchema.php` — `SECTION: TIER_EDITION`, `SECTION: TIER_EDITION_BIN` |
| REST | `PackageStationController.php` — `tierEditionContext()`, `createTierEdition`, `saveTierEditionModule`, `settleTierEditionModule`, `revertTierEditionModule`, `updateTierEditionStatus`, `restoreTierEditionEndpoint`, `deleteTierEditionEndpoint`, `tierEditionBinContext()`, `moveTierEditionToBinEndpoint`, `restoreTierEditionFromBinEndpoint`, `trashTierEditionBinEntryEndpoint`, `deleteTierEditionBinEntryEndpoint` |
| Public projection | `PricingBuilder.php` |
| Cart/request | `RequestSchema.php` |
| Admin frontend | `types.ts`, `api.ts`, `useTierEditions.ts`, `tier.tsx`, `tierEdition.tsx`, `tierEditionDetailModel.ts`, `tierEditionModel.ts`, `tierLifecycleMenu.ts`, `useTierDrawerController.ts`, `TierEditionDeclarationSwitcher.tsx`, `TierEditionBinFocusedView.tsx`, `TierEditionBinList.tsx`, `TierEditionEditor.tsx`, `TierEditionOverviewFields.tsx`, `TierDrawerContent.tsx`, `TierDrawerFooter.tsx`, `FocusedTaskShell.tsx` (drawer-kit) |
| Public frontend | `cost-builder.ts`, `PricingTiers.tsx`, `ServiceCard.tsx` |

## Related Code Maps

[Tiers](tiers.md), [Tier Add-on Selection](tier-addon.md), [Rate Sheet](rate-sheet.md), [Platform Identifier Station](platform-identifier-station.md), [Cost Builder](cost-builder.md), and [Quote Builder](quote-builder.md).
