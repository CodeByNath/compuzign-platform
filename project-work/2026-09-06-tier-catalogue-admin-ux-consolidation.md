# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW**
- Production `main`: `28b6859c1efab5044ac761f360852a19988de7b2` — unchanged, this candidate is NOT pushed to `main`.
- New candidate: `review/upgrade-shell-visual-parity` @ `0a13fd14` — one clean commit on top of current `main`, superseding the rejected `e17f6892`.

## What remains correct
Keep the current UX direction unchanged:
- Upgrade Your Build CTA inside Recommendations;
- selected primary Tier remains visible;
- pending CTA hides Add-ons + Cart;
- Browse Catalogue uses the existing `.cz-package-builder__focused` shell;
- `ComposableOfferBrowser` remains the existing preview/auto-sync mutation authority;
- Add to Quote remains exit/return only;
- catalogue-only Families stage correctly;
- no standalone Build Your Own route/card.

## One blocker found in actual source
The Edition fix now carries Edition **identity/policy**, but still prices/quotes the Default occupant's commercial declaration.

Evidence:
- `PricingEditionOption` already carries Edition-specific `price`, `billing_cycle`, `minimum_term_*`, `commercial_legs`, `headline_leg_id`, and `customer_policy`.
- `PackageRepository::resolveComposableOfferSelection()` only overlays the selected Edition's `customer_policy` onto the Default `$container`, then calls the existing resolver.
- `buildComposableFamilyTierQuoteItem()` still derives commitment from `offer.minimum_term_*` (Default), while the returned `periods` are therefore also Default-container commercial periods. It merely attaches `activeEdition.edition_platform_id` / label afterward.

That can produce a quote labelled as an Edition while its commercial legs/price/commitment are the Default occupant's. Do not ship that mismatch.

## Claude — narrow correction only
Use the existing Tier Edition commercial declaration/resolution path for the selected composable Edition — not a policy-only overlay and not a new pricing engine.

### Must preserve
- everything in “What remains correct” above;
- same one server resolver / preview / auto-sync path;
- Default behavior unchanged when `edition_id` is null;
- selected Edition must still fail closed if not active/valid.

### Must fix
When `edition_id` is present, the resolver input must represent that Edition's **full effective commercial declaration** (its own pricing/Commercial Legs/commitment/headline plus its customer-policy inheritance rules), using the platform's existing Edition authority. The resulting preview `periods` and committed quote facts must therefore all describe the same selected Edition identity.

Do not merely copy Edition labels/Platform ID onto Default-resolved periods.

### Must not substitute
- no second resolver/pricing engine;
- no client-side reconstruction of Edition price/legs;
- no redesign of CTA, focused shell, Add to Quote, auto-sync, Cart, or Recommendations.

Prepare one clean corrected candidate from current `main`, report exact SHA/files/evidence, set **AWAITING CHATGPT REVIEW**, and do not push to `main`.

## Done — evidence for `0a13fd14`

### Fix
`resolveComposableOfferSelection()`: when `$editionId` resolves to a real active Edition, the resolver's `$container` is now **replaced entirely** with that Edition's own raw declaration —

```php
$occupantCustomerPolicy = $container['customer_policy'];
$container = $edition;
$container['customer_policy'] = $edition['customer_policy'] ?? $occupantCustomerPolicy;
```

`$edition` here is one entry of `PackageSchema::sanitizeTierEditions($occupant['tier_editions'] ?? [])` — carrying its own `rate_sheet_id`/`rate_sheet_items`/`price`/`billing_cycle`/`minimum_term_value`/`minimum_term_unit`/`from_month`/`to_month`/`legs`/`headline_leg_id`. This is the **identical raw shape** `PackageRepository::compileOccupantSlotForCostBuilder()` already feeds straight into `PackageManagerSchema::resolveCommercialLegTimeline()` to price each `edition_options` entry for the read/display projection (see that function's own "prices from its own Edition's rate_sheet_id/rate_sheet_items" comment, `PackageRepository.php`) — reused verbatim, not a second/parallel pricing engine. Only `customer_policy` still follows an inherit rule (this Edition's own when set, else the occupant's own). `resolveCustomerComposableSelection()`/`resolveCommercialLegTimeline()` are otherwise completely unmodified — they now simply receive an Edition-shaped container instead of an occupant-shaped one, exactly as they already do for a normal Tier's own per-Edition Commercial Legs resolution.

Result: the preview `periods` returned, and the committed quote item's `legPaymentSummaries`/`commercialBreakdown`/`cartBreakdown` built from them, now genuinely describe the selected Edition's own commercial declaration — not the Default occupant's relabeled with the Edition's Platform ID.

### One adjacent gap found, deliberately NOT fixed this round (flagging, not fixing)
The browsable catalogue ROWS shown to the customer (`resolveComposableEligibleRows()`, frontend) join `composable_offer.inclusions` — built server-side from the **occupant's own** `rate_sheet_items` only (`PackageFamilyPricingBuilder::presentOccupant()`) — with the active Edition's `customer_policy`. If an admin ever configures a composable Edition with `rate_sheet_items` that include an item_id NOT present in the occupant's own set, that row would silently not render in the browse list even though the (now-correct) resolver could price it. Editions' own `inclusions_override` are not enriched with categories/service/unit_price the way the occupant's own is (`compileOccupantSlotForCostBuilder()` only does that enrichment for the top-level container). This is a real but narrower gap than the one just fixed, touches different code (`PackageFamilyPricingBuilder`/`compileOccupantSlotForCostBuilder`'s browse-metadata enrichment, not the resolver), and was outside this round's explicit "must fix." Not touched, per "no redesign" — surfacing for a decision on whether it needs its own round.

### Validation
`tsc --noEmit` clean, `npm run build` clean, `npm run docs:check` clean, 75/78 registered contracts pass (`admin-station-css`, `package-builder-flow`, `platform-identity-schema` — same 3 pre-existing/unrelated failures as every prior round), PHP suite: same 7 pre-existing environment-only failures as always (no WP bootstrap in this shell). `composable-customer-ux-preview.php`, `composable-customer-policy-resolver.php`, `tier-composable-occupant.php`, `composable-occupant-controller-contract.php`, `composable-customer-policy-admin-surface.php` all pass explicitly. `scripts/composable-edition-resolution-contract.ts` updated to lock the full-declaration-swap (was: policy-only-overlay). Full diff from current `main`: 17 files, +764/-826.