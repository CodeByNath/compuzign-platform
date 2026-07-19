# Cost Builder

## Purpose

Projects the active service catalogue, package tiers, bundles, promotions, and FAQs into the public interactive pricing and selection experience.

## Ownership

`CostBuilderApp` owns only transient browsing and quote-selection state; browser storage retains the current cart. PHP repositories and `PricingBuilder` own the authoritative public projection. The Cost Builder must not mutate admin catalogue or Package Station configuration.

## Main Entry Points

- [cost-builder.ts](../../wp-content/plugins/compuzign-platform/resources/ts/modules/cost-builder.ts) registers the Cost Builder component and mount condition with the runtime registry. Use it for module registration or mount behavior.
- [CostBuilderApp.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/cost-builder/CostBuilderApp.tsx) contains category/service navigation, quote-item ownership, persistence, service cards, pricing and promotion sections, summaries, mobile bar, comparison/FAQ areas, and request-modal launch. Use it for top-level Cost Builder state and composition.
- [cost-builder.php](../../wp-content/plugins/compuzign-platform/app/modules/cost-builder/templates/cost-builder.php) provides the server-rendered mount target and page wrapper. Use it for PHP-side page structure.

## UI and State

- [useCostBuilder.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useCostBuilder.ts) owns public projection loading, errors, and refetch. Use it for fetch state.
- [ServiceGrid.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/cost-builder/ServiceGrid.tsx) renders the active category’s Service cards. Use it for grid layout and selection handoff.
- [PricingTiers.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/cost-builder/PricingTiers.tsx) renders Tier option cards, popular treatment, prices, inclusions, and selection buttons. Use it for customer Tier choice UI.
- [QuoteSummary.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/cost-builder/QuoteSummary.tsx) renders selected items, totals, remove actions, and request CTA. Use it for desktop quote summary behavior.
- [cartStorage.ts](../../wp-content/plugins/compuzign-platform/resources/ts/utils/cartStorage.ts) loads, saves, and clears browser quote state. Use it for cart persistence format.

## Backend and Persistence

- [CostBuilderController.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Http/CostBuilderController.php) registers public projection and privileged import/dry-run routes. Use it for REST permissions, responses, and import endpoints.
- [PricingBuilder.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Services/PricingBuilder.php) assembles categories, Services, Tiers, packages, promotions, bundles, and FAQs into the public response. Use it for projection and visibility/readiness rules.
- [ServiceRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Repositories/ServiceRepository.php) reads active Service posts, taxonomy, metadata, and pricing inputs. Use it for catalogue persistence queries.
- [cost-builder.ts](../../wp-content/plugins/compuzign-platform/resources/ts/api/endpoints/cost-builder.ts) exposes the typed public fetch. Use it for client response contracts.

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

From the plugin root: `npx tsc --noEmit`, `npm run build`, `php tests/tier-pricing-parity.php`, and `npm run docs:check`.

## Related Code Maps

[Rate Sheet](rate-sheet.md), [Tiers](tiers.md), and [Quote Builder](quote-builder.md).
