# Tier Edition

## Purpose and ownership

A Tier occupant's own existing declaration — Rate Sheet binding, selected
rows, price, billing cycle, inclusions, FAQs — is the **permanent Default**.
It remains the Tier itself, uses the occupant's own `CZT`, and never becomes
a `tier_editions[]` row. A Tier Edition exists only when an administrator
registers an **additional**, alternate commercial declaration for that same
occupant — e.g. Monthly vs Annual. Not another Tier, not a Tier Add-on, not
a `TIER_MODULES` entry: an independently addressed, independently
lifecycled child record inside `current_occupant.tier_editions[]`, carrying
its own `CZTE` and its own [shared `StationLifecycle`](../architecture/StationDrawerLifecycleContract-v1.md)
state. The occupant remains the one public Tier the customer selects;
switching between Default and any Editions never changes which occupant is
selected.

Each Edition carries `id`, `edition_platform_id` (empty until first Active),
`title`, `admin_description`, lifecycle status fields, one consolidated
`overview` module (closer in size to a Package Family row than the
occupant's three-module split), `rate_sheet_id`/`rate_sheet_items` (same
shape/switch-clears-selections rule as the occupant's binding),
`price`/`contact`/`billing_cycle`, `minimum_term_value`/`minimum_term_unit`,
`inclusions_override`/`faq_refs` (empty means inherit the occupant's).

There is no default-Edition pointer. An earlier `default_edition_id` field
let an Edition's terms *replace* the occupant's as system-of-record,
inverting the intended model; it was removed. The occupant's own fields are
always Default; every Edition is always an alternate.

## Overview registration

Overview carries one small derived read field, "Editions" — `1` plus
however many rows `tier_editions[]` holds, never a separately persisted
count (`tierDetailModel.ts`'s `tierEditionsCount`) — and one footer action,
"+ Edition", beside Edit. Clicking it mints one child immediately via the
same `createTierEdition()` the tab strip below uses, auto-titled (derived
from the current count, not a permanent sequence); Overview collects no
title/price/lifecycle action (`useTierDrawerController.ts`'s
`handleAddEdition`).

## Identity

`CZTE` uses an **occupant-qualified**, not slot-qualified, native reference
— `PackagePlatformNativeReference::tierEdition($tierInstanceId, $occupantId,
$editionId)`, mirroring `tierOccupant()`. Assigned on first Active via the
same reserve → persist → bind sequence `CZT`/`CZTA` use. Admin/audit
only — never exposed publicly or in the cart.

## Lifecycle and cascade

Full `StationLifecycle` vocabulary via one generic `PATCH .../status`
endpoint (engine transition + Disable/Enable mask), Package Family's own
`/status` shape. Guarded permanent delete requires trashed status only — no
default-Edition guard, since Default is never a `tier_editions[]` row. Parent-to-child cascade reuses per-Edition transition
functions verbatim; `cascaded_edition_ids` on the bin entry scopes a later
Tier-level trash/restore to only the ids that same archive carried, and
restore lands at `disabled`, never `active`.

No Edition-level slot/bin split exists yet (mirroring the occupant's own
`occupant_bin`) — every Edition is one row in the same array regardless of
status. Separate, larger, narrowly-scoped future work.

## Public projection and Cost Builder

`publicTierEditionOptions()` (Active only, no `edition_platform_id`, no
"default" flag) feeds `edition_options`, empty for every Tier that never
used this capability. `extractTierForCostBuilder()` always resolves the
occupant's own terms as the primary fields — an Edition never displaces
them. `PricingTiers.tsx` renders the switch once **one** Edition exists: an
always-present "Default" button alongside any Edition buttons.
`ServiceCard.tsx` captures whichever declaration was showing at the click.

## Cart and request

`QuoteItem`/`RequestSchema::sanitizeItems()` carry only structured
`minimumTermValue`/`minimumTermUnit`. No Edition identity in cart/request.

## Admin editing

`useTierEditions.ts` owns seven endpoints (create, module draft/settle/
revert, one status endpoint, restore, guarded delete) and Edition-scoped
state. The Included-Features module is titled **Inclusions & Editions**;
content/editor unchanged, still the occupant's own Default only.
`TierEditionDeclarationSwitcher.tsx` mounts after it (`trailing` slot),
gated on a real occupant: a `[Default] [Edition 2]` tab strip showing one
declaration's surface at a time, reusing
`TierEditionOverviewFields.tsx`/`PoolInclusionsEditor` unchanged. Selecting
Default shows a pointer back to the module above. A separate scoped
`tier-edition:{...}` drawer existed with no reachable UI trigger and was
retired once this switcher gave the capability a real home.

The selected declaration id lives in `useTierDrawerController.ts`
(`selectedDeclarationId`), not local state in the switcher:
`TierDrawerContent.tsx` renders `<AsyncLoading/>` for its child tree
whenever `!pkg.detailLoaded`, and every Edition mutation refetches — local
child state would silently reset to Default after each click. Resets on
navigating to a different Tier.

## Authoritative implementation

| Area | Files |
|---|---|
| Identity | `PlatformIdentifierPolicy.php`, `PackagePlatformNativeReference.php`, `PackagePlatformIdentifierAdapters.php`, `PackageRepository.php` (`tierEdition*`) |
| Schema/lifecycle | `PackageSchema.php` — `SECTION: TIER_EDITION` |
| REST | `PackageStationController.php` — `tierEditionContext()`, `createTierEdition`, `saveTierEditionModule`, `settleTierEditionModule`, `revertTierEditionModule`, `updateTierEditionStatus`, `restoreTierEditionEndpoint`, `deleteTierEditionEndpoint` |
| Public projection | `PricingBuilder.php` |
| Cart/request | `RequestSchema.php` |
| Admin frontend | `types.ts`, `api.ts`, `useTierEditions.ts`, `tier.tsx`, `useTierDrawerController.ts`, `TierEditionDeclarationSwitcher.tsx`, `TierEditionOverviewFields.tsx`, `TierDrawerContent.tsx` |
| Public frontend | `cost-builder.ts`, `PricingTiers.tsx`, `ServiceCard.tsx` |

## Related Code Maps

[Tiers](tiers.md), [Tier Add-on Selection](tier-addon.md), [Rate Sheet](rate-sheet.md), [Platform Identifier Station](platform-identifier-station.md), [Cost Builder](cost-builder.md), and [Quote Builder](quote-builder.md).
