# Tier Edition

## Purpose and ownership

A Tier Edition is one mutually exclusive commercial declaration owned by a
Tier occupant — e.g. Monthly vs Annual. It is not another Tier, not a Tier
Add-on, and not a `TIER_MODULES` entry: it is an independently addressed,
independently lifecycled child record nested inside
`current_occupant.tier_editions[]`, carrying its own canonical `CZTE`
identity and its own [shared `StationLifecycle`](../architecture/StationDrawerLifecycleContract-v1.md)
state. The occupant remains the one public Tier and the one thing the
customer selects; switching Editions never changes which occupant is
selected.

Each Edition carries `id`, `edition_platform_id` (empty until first Active),
`title`, `admin_description`, `platform_status`/`previous_platform_status`/
`is_explicitly_disabled`, one consolidated `overview` module (`drafts`/
`module_status` — not the occupant's three-module Overview/Features/FAQs
split; closer in size to a Package Family row), `rate_sheet_id`/
`rate_sheet_items` (same shape and switch-clears-selections rule as the
occupant's own binding), `price`/`contact`/`billing_cycle`,
`minimum_term_value`/`minimum_term_unit`, and `inclusions_override`/
`faq_refs` (empty means inherit the occupant's own declaration).

An occupant carries `default_edition_id`, an explicit pointer (never
positional/array-order inference) that
[`PackageSchema::sanitizeDefaultEditionId`](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php)
resolves defensively to `null` whenever it no longer matches an existing
Edition, so it can never dangle.

## Identity

`CZTE` uses an **occupant-qualified**, not slot-qualified, native reference —
`PackagePlatformNativeReference::tierEdition($tierInstanceId, $occupantId,
$editionId)` — mirroring `tierOccupant()`'s own discipline, so identity stays
attached to the occupant that owns it through slot swap, retarget, or
replacement, never to a container that can hold a different occupant later.
Assigned on first transition to Active through the identical reserve →
persist → bind sequence (with reconciliation-safe resume)
`settlePackageStationTier()` already uses for `CZT`/`CZTA`. Never touched by
any other transition, never exposed in the public Cost Builder projection or
the cart — `CZTE` stays an admin/audit/connection identity only.

## Lifecycle and cascade

Full `StationLifecycle` vocabulary (draft/active/disabled/archived/trashed),
via one generic `PATCH .../editions/{edition}/status` endpoint carrying both
the engine transition (`platform_status`) and the explicit Disable/Enable
mask (`action`) — the same one-route shape Package Family's own `/status`
endpoint uses. Guarded permanent delete requires trashed status and refuses
the current default Edition.

Parent-to-child cascade is thin orchestration only, reusing the per-Edition
transition functions verbatim: `cascadeArchiveTierEditions()` records exactly
which Edition ids were live at that moment (`cascaded_edition_ids` on the
occupant-bin entry); a later Tier-level trash or restore of that same bin
entry revisits only that recorded set, so an Edition already independently
archived or trashed before the parent moved is never swept up. Parent
permanent deletion needs no Edition-specific code — the whole bin entry is
discarded structurally.

## Public projection and Cost Builder

`PackageSchema::publicTierEditionOptions()` (Active Editions only, no
`edition_platform_id`, no admin-only fields) feeds `edition_options` on
`PricingTierData`, additive and empty for every Tier that has never used
this capability. `resolveDefaultTierEdition()` resolves the default Active
Edition's own commercial terms (price/billing_cycle/contact/Rate-Sheet
binding — never blended with the occupant's) into the same flat fields
`extractTierForCostBuilder()`/`PricingBuilder::overlayPackage()` already
emit; declaration fields (label/inclusions/faq_refs) inherit the occupant's
own value when the Edition leaves them empty.

`PricingTiers.tsx`'s `resolveEffectiveTierDisplay()` renders the in-card
switch inside the same shared `TierCard` both the normal-Tier and Add-on
strips already use — never a second card or comparison row. `ServiceCard.tsx`
builds the `QuoteItem` from the switched card's own resolved `effective`
display, so the cart captures whichever Edition was showing at the click.

## Cart and request

`QuoteItem`/`RequestSchema::sanitizeItems()` carry only
`minimumTermValue`/`minimumTermUnit` — structured data, not presentation
text. No Edition identity travels into cart-line identity or the request
payload; `CZTE` remains admin/audit-only.

## Admin editing

[`useTierEditions.ts`](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/useTierEditions.ts)
is a focused hook (not folded into `usePackageStation.ts`) owning the eight
Edition endpoints and Edition-scoped local state.
[`TierEditionsPanel.tsx`](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierEditionsPanel.tsx)
is an inline panel printed inside the individual Tier drawer's Details tab
(`EntityDrawer`'s `trailing` slot), gated on a real occupant existing, driving
every lifecycle transition only through the hook's own functions. Not yet a
scoped `tier-edition:{instance}:{slot}:{editionId}` drawer route with its own
`CanonicalEntityFooter` footer-slot takeover, and not yet Rate-Sheet row-level
selection UI (binding only) — both flagged as follow-up.

## Authoritative implementation

| Area | Files |
|---|---|
| Identity | `PlatformIdentifierPolicy.php` (`TIER_EDITION`/`CZTE`), `PackagePlatformNativeReference.php`, `PackagePlatformIdentifierAdapters.php`, `PackageRepository.php` (`tierEdition*` methods) |
| Schema/lifecycle | `PackageSchema.php` — `SECTION: TIER_EDITION` (sanitisers, `find`/`replace`/`add`/`delete`, module draft/settle/revert, engine transitions, cascade, `resolveDefaultTierEdition`, `publicTierEditionOptions`) |
| REST | `PackageStationController.php` — `tierEditionContext()`, `createTierEdition`, `saveTierEditionModule`, `settleTierEditionModule`, `revertTierEditionModule`, `updateTierEditionStatus`, `restoreTierEditionEndpoint`, `deleteTierEditionEndpoint`, `setTierEditionDefault` |
| Public projection | `PricingBuilder.php` (`overlayPackage`/`normalizePricing`) |
| Cart/request | `RequestSchema.php` |
| Admin frontend | `types.ts`, `api.ts`, `useTierEditions.ts`, `TierEditionsPanel.tsx`, `TierDrawerContent.tsx` |
| Public frontend | `cost-builder.ts` (api types), `PricingTiers.tsx`, `ServiceCard.tsx` |

## Related Code Maps

[Tiers](tiers.md), [Tier Add-on Selection](tier-addon.md), [Rate Sheet](rate-sheet.md), [Platform Identifier Station](platform-identifier-station.md), [Cost Builder](cost-builder.md), and [Quote Builder](quote-builder.md).
