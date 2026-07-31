# Tier Add-on Selection

## Purpose and ownership

`is_addon` is an occupant-level presentation and selection-behaviour flag, owned by Package Station alongside every other occupant field in [Tiers](tiers.md). It does not change occupant identity, lifecycle, Rate Sheet ownership, Tier Instance assignment, or the five-shell invariant. A Tier System offers the customer one normal Tier (`is_addon: false`) plus zero or more add-on Tiers (`is_addon: true`) from that **same** Tier System. Same-Tier-System add-on compatibility is implicit — there is no compatibility ledger, no cross-Tier-Instance resolution, and no second occupant collection.

## Backend

- [PackageSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php) — `is_addon` lives on `current_occupant`, defaulting `false`, threaded through `upsertOccupant`, `normaliseTierSlot`, `summariseTierSlot`, and `extractTierForCostBuilder`. `settleTierSlot` draft-prefers it (`$ov['is_addon'] ?? $occ['is_addon']`) exactly like `label`/`billing_cycle`. It is not written by `archiveTierOccupant`/`restoreBinnedOccupant`/`trashBinnedOccupant`/`deleteBinnedOccupant` — those copy the whole stored occupant record, so the flag survives archive, restore, retarget, and swap for free.
- [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) — `savePackageStationTierModule`'s `overview` branch accepts `is_addon` in the draft body. No new endpoint exists for this field; it rides the existing Overview module save/settle/revert flow.
- [PricingBuilder.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Services/PricingBuilder.php) — `normalizePricing` defaults every canonical/legacy tier to `is_addon: false`; `overlayPackage` copies the occupant's own value onto every Tier shell that survives its existing enabled/configured checks. A disabled or archived add-on is suppressed by those same checks, identically to a disabled or archived normal Tier — no add-on-specific visibility rule exists.

## Frontend

- [types.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/types.ts) / [cost-builder.ts](../../wp-content/plugins/compuzign-platform/resources/ts/api/types/cost-builder.ts) — `SurfaceTierDetail`, `SurfaceTierSummary`, `TierOverviewDraft`, and the public `PricingTierData` all carry `is_addon`.
- [TierOverviewEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/editors/TierOverviewEditor.tsx) — the "Make this Tier an add-on" checkbox, beside the existing popular-Tier control, following the project's `AdminField` checkbox contract.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) — `draftPreferredDetail` (exported for contract testing) merges a pending `is_addon` draft over the settled occupant, the same rule as every other Overview scalar.
- [PricingTiers.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/cost-builder/PricingTiers.tsx) — splits the one projected Tier map into "Choose your Tier" (`!is_addon`, existing single-select `TierCard`) and "Optional add-ons" (`is_addon`, independent toggle), sharing one `TierCard` renderer so the visual language, CSS, and dark/light theming are defined exactly once. Renders no add-ons section when none exist. [ServiceCard.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/cost-builder/ServiceCard.tsx) owns `handleSelect` (normal, exclusive) and `handleToggleAddon` (independent); an add-on can never replace the normal selection. [ComparePlans.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/cost-builder/ComparePlans.tsx) excludes add-on Tiers from its comparison columns.

## Quote cart identity

[quote.ts](../../wp-content/plugins/compuzign-platform/resources/ts/utils/quote.ts) is the single source of truth for cart-line identity and mutation, since `serviceId` alone stopped being unique once a Service can carry one normal line plus multiple add-on lines:

- `quoteItemKey` — `serviceId:primary` or `serviceId:addon:tierId`, used for every list key.
- `replaceNormalQuoteItem` — replaces only the existing non-add-on line for a `serviceId` (a normal Tier, a promotion, or the legacy bundle); every add-on for that `serviceId` survives. This is why switching the normal Tier preserves selected add-ons.
- `upsertAddonQuoteItem` / `removeAddonQuoteItem` — add-on lines, keyed by `serviceId` + `tierId`, independent of the normal line and of each other.
- `removeServiceQuoteItems` — removes a whole Service's normal line and every add-on; also the correct behaviour for deselecting the normal Tier outright, since an add-on has nothing to attach to without one.
- `classifyQuoteItems` — the one shared split into `mainItems` / `bundleItems` / `tierAddonItems`, used by both [OrderSummary.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/request-flow/OrderSummary.tsx) and [QuoteProposalPreview.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/request-flow/QuoteProposalPreview.tsx). Classification is always by `isAddon` or by the legacy bundle's own negative `serviceId` — never by inferring one from the other.

[RequestSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/Requests/Support/RequestSchema.php) sanitises `isAddon` to a strict boolean, defaulting `false`.

## Legacy recommended bundle

[RecommendedBundle.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/cost-builder/RecommendedBundle.tsx) is unrelated and untouched: it still mints a synthetic negative `serviceId` and remains the only place that does. It is not a Tier occupant, carries no `is_addon` meaning beyond the literal `false` every `QuoteItem` now requires, and is classified into `bundleItems`, never `tierAddonItems`. New code must not use a negative `serviceId` for a real Tier add-on.

## Invariants

- Every existing occupant defaults `is_addon: false`; no stored-data migration is required.
- `is_addon` never changes `platform_status`, module `module_status`, occupant id, or Rate Sheet selections.
- No compatibility ledger, cross-Tier-Instance resolution, sixth shell, or second occupant collection exists for this capability.

## Validation

From the plugin root: `php tests/tier-occupant-is-addon.php`, `php tests/tier-public-projection-is-addon.php`, `php tests/tier-addon-end-to-end.php`, `php tests/request-schema-is-addon.php`, `npm run contract:tier-overview-is-addon`, `npm run contract:quote-cart-addon`, `npm run contract:tier-addon-flow`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Tiers](tiers.md), [Cost Builder](cost-builder.md), and [Quote Builder](quote-builder.md).
