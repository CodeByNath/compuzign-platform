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
state. The occupant remains the one public Tier selected; switching
Default/Edition never changes that.

Each Edition carries `id`, `edition_platform_id`, `title`,
`admin_description`, lifecycle fields, one consolidated `overview` module
(Package-Family-row-sized), `rate_sheet_id`/`rate_sheet_items` (same
switch-clears-selections rule as the occupant's binding),
`price`/`contact`/`billing_cycle`/`minimum_term_value`/`minimum_term_unit`,
and `inclusions_override`/`faq_refs` (empty inherits the occupant's).

There is no default-Edition pointer — an earlier `default_edition_id` field
let an Edition *replace* the occupant's terms, inverting the model, and was
removed. The occupant's own fields are always Default; every Edition is
always an alternate.

## Overview registration

Overview carries one small derived read field, "Editions" — `1` plus however
many rows `tier_editions[]` holds, never a separately persisted count
(`tierDetailModel.ts`'s `tierEditionsCount`) — and one footer action,
"+ Edition", beside Edit. Clicking it mints one child immediately via the
same `createTierEdition()` the tab strip uses, auto-titled from the current
count, not a permanent sequence (`useTierDrawerController.ts`'s
`handleAddEdition`); Overview collects no title/price/lifecycle action.

## Identity

`CZTE` uses an **occupant-qualified**, not slot-qualified, native reference
— `PackagePlatformNativeReference::tierEdition($tierInstanceId, $occupantId,
$editionId)`, mirroring `tierOccupant()`. Assigned on first Active via the
same reserve → persist → bind sequence `CZT`/`CZTA` use. Admin/audit only —
never public or in the cart.

## Lifecycle and cascade

Full `StationLifecycle` vocabulary via one generic `PATCH .../status`
endpoint (engine transition + Disable/Enable mask), Package Family's own
`/status` shape. Guarded permanent delete requires trashed status only — no
default-Edition guard, since Default is never a `tier_editions[]` row.
Parent-to-child cascade reuses per-Edition transition functions verbatim;
`cascaded_edition_ids` scopes a later Tier-level trash/restore to only the
ids that same archive carried; restore lands `disabled`, never `active`.
Cascade reads only `tier_editions[]`, so a binned Edition (below) is
invisible to it.

## Edition bin (Phase 6)

`current_occupant.tier_edition_bin[]` is a narrow, occupant-owned physical
bin mirroring `occupant_bin`'s own archive/restore/trash/delete shape one
level deeper, but **decoupled** from `/status` above: moving requires the
Edition already `archived`/`trashed` and never itself changes
`platform_status`. A bin entry is narrow — `bin_id`/`edition` (full row,
`CZTE` included)/`status`/`displaced_at` only, none of `occupant_bin`'s
origin/retarget/cascade metadata, meaningless here.

`tier_editions[]` numbering is array-derived; moving out compacts it, and
restore always appends to the end (no swap/retarget), reusing
`restoreTierEdition()` — lands `disabled`, never `active`.
`trashTierEditionBinEntry()`/`deleteTierEditionBinEntry()` mirror
`trashBinnedOccupant()`/`deleteBinnedOccupant()`. Cascade (above) never
reaches a binned Edition, so it stays binned through a parent restore.
`PackageRepository`'s identity lookups and `upsertOccupant()`'s
verbatim-preservation both cover `tier_edition_bin[]` alongside
`tier_editions[]`.

## Public projection and Cost Builder

`publicTierEditionOptions()` (Active only, no `edition_platform_id`, no
"default" flag) feeds `edition_options`, empty for every Tier that never
used this capability. `extractTierForCostBuilder()` always resolves the
occupant's own terms as primary — an Edition never displaces them.
`PricingTiers.tsx` renders the switch once **one** Edition exists: an
always-present "Default" button plus any Edition buttons. `ServiceCard.tsx`
captures whichever declaration was showing at the click.

## Cart and request

`QuoteItem`/`RequestSchema::sanitizeItems()` carry only structured
`minimumTermValue`/`minimumTermUnit`. No Edition identity in cart/request.

## Admin editing

`useTierEditions.ts` owns eleven endpoints (create, module draft/settle/
revert, status, restore, guarded delete, plus Phase 6's
`moveToBin`/`restoreFromBin`/`trashBinEntry`/`deleteBinEntry`) and
Edition-scoped state including `tier_edition_bin[]`. The Included-Features
module is titled **Inclusions & Editions** (unchanged, Default only).
`TierEditionDeclarationSwitcher.tsx` mounts after it, gated on a real
occupant: a `[Default] [Edition 2]` tab strip reusing
`TierEditionOverviewFields.tsx`, plus Phase 6's bin UI — "Move to bin" on an
archived/trashed Edition, and a collapsed "Edition bin (n)" row for
Restore/Trash/Delete where lifecycle rules permit (no second drawer).

The selected declaration id lives in `useTierDrawerController.ts`, not
local switcher state, since `TierDrawerContent.tsx` unmounts its child tree
while `!pkg.detailLoaded`, which would otherwise reset the tab to Default.

## Authoritative implementation

| Area | Files |
|---|---|
| Identity | `PlatformIdentifierPolicy.php`, `PackagePlatformNativeReference.php`, `PackagePlatformIdentifierAdapters.php`, `PackageRepository.php` (`tierEdition*`, edition-bin-aware) |
| Schema/lifecycle | `PackageSchema.php` — `SECTION: TIER_EDITION`, `SECTION: TIER_EDITION_BIN` |
| REST | `PackageStationController.php` — `tierEditionContext()`, `createTierEdition`, `saveTierEditionModule`, `settleTierEditionModule`, `revertTierEditionModule`, `updateTierEditionStatus`, `restoreTierEditionEndpoint`, `deleteTierEditionEndpoint`, `tierEditionBinContext()`, `moveTierEditionToBinEndpoint`, `restoreTierEditionFromBinEndpoint`, `trashTierEditionBinEntryEndpoint`, `deleteTierEditionBinEntryEndpoint` |
| Public projection | `PricingBuilder.php` |
| Cart/request | `RequestSchema.php` |
| Admin frontend | `types.ts`, `api.ts`, `useTierEditions.ts`, `tier.tsx`, `useTierDrawerController.ts`, `TierEditionDeclarationSwitcher.tsx`, `TierEditionOverviewFields.tsx`, `TierDrawerContent.tsx` |
| Public frontend | `cost-builder.ts`, `PricingTiers.tsx`, `ServiceCard.tsx` |

## Related Code Maps

[Tiers](tiers.md), [Tier Add-on Selection](tier-addon.md), [Rate Sheet](rate-sheet.md), [Platform Identifier Station](platform-identifier-station.md), [Cost Builder](cost-builder.md), and [Quote Builder](quote-builder.md).
