# Cost Builder

## Purpose

Projects the active service catalogue, package tiers, bundles, promotions, and FAQs into the public interactive pricing and selection experience.

## Ownership

`CostBuilderApp` owns only transient browsing and quote-selection state; browser storage retains the current cart. PHP repositories and `PricingBuilder` own the authoritative public projection. The Cost Builder must not mutate admin catalogue or Package Station configuration.

## Main Entry Points

- [cost-builder.ts](../../wp-content/plugins/compuzign-platform/resources/ts/modules/cost-builder.ts) registers the component and mount condition.
- [CostBuilderApp.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/cost-builder/CostBuilderApp.tsx) contains category/service navigation, quote-item ownership, persistence, service cards, pricing and promotion sections, summaries, mobile bar, comparison/FAQ areas, and request-modal launch. Use it for top-level Cost Builder state and composition.
- [cost-builder.php](../../wp-content/plugins/compuzign-platform/app/modules/cost-builder/templates/cost-builder.php) provides the server-rendered mount target and wrapper.

## UI and State

- [useCostBuilder.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useCostBuilder.ts) owns public projection loading, errors, and refetch. Use it for fetch state.
- [ServiceGrid.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/cost-builder/ServiceGrid.tsx) renders the active category’s Service cards. Use it for grid layout and selection handoff.
- [PricingTiers.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/cost-builder/PricingTiers.tsx) renders Tier option cards, popular treatment, prices, inclusions, and selection buttons, splitting the one projected Tier map into "Choose your Tier" (exclusive) and "Optional add-ons" (independent toggle) by `is_addon` — see [Tier Add-on Selection](tier-addon.md). Its `resolveEffectiveTierDisplay()` also renders an in-card, mutually-exclusive Tier Edition switch (`edition_options`) inside the same shared `TierCard` — never a second card, never a different selected Tier — see [Tier Edition](tier-edition.md). Use it for customer Tier choice UI.
- [QuoteSummary.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/cost-builder/QuoteSummary.tsx) renders selected items, totals, remove actions, and request CTA. Use it for desktop quote summary behavior.
- [cartStorage.ts](../../wp-content/plugins/compuzign-platform/resources/ts/utils/cartStorage.ts) loads, saves, and clears browser quote state. Use it for cart persistence format.

## Backend and Persistence

- [CostBuilderController.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Http/CostBuilderController.php) registers public projection and privileged import/dry-run routes. Use it for REST permissions, responses, and import endpoints.
- [PricingBuilder.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Services/PricingBuilder.php) assembles categories, Services, Tiers, packages, promotions, bundles, and FAQs into the public response. Use it for projection and visibility/readiness rules.
- [ServiceRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Repositories/ServiceRepository.php) reads active Service posts, taxonomy, metadata, and pricing inputs. Use it for catalogue persistence queries.
- [cost-builder.ts](../../wp-content/plugins/compuzign-platform/resources/ts/api/endpoints/cost-builder.ts) exposes the typed public fetch. Use it for client response contracts.

Package Station resolves overlays before they reach `PricingBuilder`: Service source → active Package Family → assignment → ready Tier instance. Cost Builder is only a consumer; it owns no assignment or Package rule. Missing or ambiguous edges create no overlay and mark a covered Service unavailable, preventing legacy XLSX pricing from borrowing another Family's offer. `PricingBuilder::overlayPackage` additionally copies each surviving occupant's own `is_addon` onto its projected Tier; no separate add-on collection is exposed. The occupant's own commercial terms (`PackageSchema::extractTierForCostBuilder`) are always the flat `price`/`billing_cycle`/`contact`/`inclusions` fields — never displaced by an Edition — plus an additive `edition_options` array (Active Editions only, no Platform ID) for the in-card switch, which renders once one Edition exists alongside an always-present Default option — see [Tier Edition](tier-edition.md). Every Tier with no Editions projects byte-identically to before this capability existed.

Fresh unavailable responses render the Service identity and `Currently this service is not available.`, with no selectable core Tier, bundle, promotion, comparison, or quote offer. Existing cart, quote-total and printable/PDF proposal calculations are unchanged. Phase 9 intentionally leaves established local-cart snapshot, hard-refresh, repricing, and removal behavior unchanged; it adds no Cost Builder redesign or Package authority.

## Internal File Navigation

| Concern | Marker | Contains | Read when... |
| --- | --- | --- | --- |
| Catalogue response | `SECTION: CATALOGUE_RESPONSE` | Public response assembly | Changing projection shape |
| Service payload | `SECTION: SERVICE_PAYLOAD` | Service defaults and pricing | Changing Service projection |
| Package overlay | `SECTION: PACKAGE_OVERLAY` | Packages and promotions | Changing commercial overlays |
| Normalization | `SECTION: PRICING_NORMALIZATION` | Pricing, inclusions, FAQs | Changing normalized output |
| Station shape | `SECTION: PACKAGE_STATION_SHAPE` | Legacy Package defaults/sources | Tracing legacy station data |
| Rate Sheet | `SECTION: RATE_SHEET_SCHEMA` | Identity and validation | Changing legacy Rate Sheets |
| Tier pricing | `SECTION: TIER_PRICING` | Selections, totals, readiness | Changing tier evaluation |
| Commercial projection | `SECTION: COMMERCIAL_PROJECTION` | Active Package output | Changing public Packages |

## Runtime Flow

The runtime mounts the app, the hook fetches the public projection, and UI selections persist locally before handing a quote cart to the request flow.

## Validation

From the plugin root: `php tests/tier-capability-invariants.php`, `php tests/tier-instance-public-projection.php`, `php tests/tier-public-projection-is-addon.php`, `php tests/tier-pricing-parity.php`, `php tests/tier-edition-public-projection.php`, `npm run contract:cost-builder-isolation`, `npm run contract:tier-addon-flow`, `npm run contract:tier-edition-switch`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Rate Sheet](rate-sheet.md), [Tiers](tiers.md), [Tier Add-on Selection](tier-addon.md), [Tier Edition](tier-edition.md), and [Quote Builder](quote-builder.md).
