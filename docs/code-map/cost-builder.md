# Cost Builder

## Purpose

Projects the active service catalogue, package tiers, bundles, promotions, and FAQs into the public interactive pricing and selection experience.

The additive Package Family customer builder follows a separate public read:
active Family (commercial assignment consumer) → explicit assignment → active
Tier Instance (Tier-system container) → compiled active occupants. It never
discovers a Tier Instance through a Service. Services remain upstream Rate
Sheet inclusion sources.

## Ownership

`CostBuilderApp` owns only transient browsing and quote-selection state; browser storage retains the current cart. PHP repositories and `PricingBuilder` own the authoritative public projection. The Cost Builder must not mutate admin catalogue or Package Station configuration.

## Main Entry Points

- [cost-builder.ts](../../wp-content/plugins/compuzign-platform/resources/ts/modules/cost-builder.ts) registers the component and mount condition.
- The same entry registers `PackageBuilderApp` at the additive
  `[compuzign_package_builder]` mount; `[compuzign_cost_builder]` is unchanged.
- [CostBuilderApp.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/cost-builder/CostBuilderApp.tsx) contains category/service navigation, quote-item ownership, persistence, service cards, pricing and promotion sections, summaries, mobile bar, comparison/FAQ areas, and request-modal launch. Use it for top-level Cost Builder state and composition.
- [cost-builder.php](../../wp-content/plugins/compuzign-platform/app/modules/cost-builder/templates/cost-builder.php) provides the server-rendered mount target and wrapper.

## UI and State

- [useCostBuilder.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useCostBuilder.ts) owns public projection loading, errors, and refetch. Use it for fetch state.
- [PricingTiers.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/cost-builder/PricingTiers.tsx) renders Tier option cards, popular treatment, prices, inclusions, and selection buttons, splitting the one projected Tier map into "Choose your Tier" (exclusive) and "Optional add-ons" (independent toggle) by `is_addon` — see [Tier Add-on Selection](tier-addon.md). Its `resolveEffectiveTierDisplay()` also renders an in-card, mutually-exclusive Tier Edition switch (`edition_options`) inside the same shared `TierCard` — never a second card, never a different selected Tier — see [Tier Edition](tier-edition.md). Use it for customer Tier choice UI.
- [QuoteSummary.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/cost-builder/QuoteSummary.tsx) renders selected items, totals, remove actions, and request CTA. Use it for desktop quote summary behavior.
- [cartStorage.ts](../../wp-content/plugins/compuzign-platform/resources/ts/utils/cartStorage.ts) loads, saves, and clears browser quote state. Use it for cart persistence format.
- `components/package-builder/PackageBuilderApp.tsx` owns Family selection and
  reuses `PricingTiers`, the shared cart, Quote Summary, and Request Flow.
  `FamilyTierAdapter.tsx` converts `EffectiveTierDisplay` into a discriminated
  `family_tier` snapshot. `FullBuildDetail.tsx` displays only the compiled
  effective inclusion labels.

## Backend and Persistence

- [CostBuilderController.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Http/CostBuilderController.php) registers public projection and privileged import/dry-run routes. Use it for REST permissions, responses, and import endpoints.
- `PackageBuilderController.php` registers public read-only `GET
  /package-builder`; `PackageFamilyPricingBuilder.php` narrows the direct
  Family projection into customer Tier data without another pricing engine.
- [PricingBuilder.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Services/PricingBuilder.php) assembles categories, Services, Tiers, packages, promotions, bundles, and FAQs into the public response. Use it for projection and visibility/readiness rules.
- [ServiceRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Repositories/ServiceRepository.php) reads active Service posts, taxonomy, metadata, and pricing inputs. Use it for catalogue persistence queries.
- [cost-builder.ts](../../wp-content/plugins/compuzign-platform/resources/ts/api/endpoints/cost-builder.ts) exposes the typed public fetch. Use it for client response contracts.

Package Station resolves overlays before they reach `PricingBuilder`: Service source → active Package Family → assignment → ready Tier instance. Cost Builder is only a consumer; it owns no assignment or Package rule. Missing or ambiguous edges create no overlay and mark a covered Service unavailable, preventing legacy XLSX pricing from borrowing another Family's offer. `PricingBuilder::overlayPackage` additionally copies each surviving occupant's own `is_addon` onto its projected Tier; no separate add-on collection is exposed. The occupant's own commercial terms (`PackageSchema::extractTierForCostBuilder`) are always the flat `price`/`billing_cycle`/`contact`/`inclusions` fields — never displaced by an Edition — plus an additive `edition_options` array (Active Editions only, no Platform ID) for the in-card switch, which renders once one Edition exists alongside an always-present Default option — see [Tier Edition](tier-edition.md). Every Tier with no Editions projects byte-identically to before this capability existed.

The Family-only response carries native Family/Tier Instance/occupant IDs for
backend logic alongside their `CZPG`/`CZTG`/`CZT` or `CZTA` Platform business
identifiers. An offered Edition also carries `CZTE`. These additions do not
enter the established Service-rooted response.

Unavailable Service responses expose no selectable Tier, bundle, promotion,
comparison, or quote offer.

## Runtime Flow

The runtime mounts the app, the hook fetches the public projection, and UI selections persist locally before handing a quote cart to the request flow.

## Validation

From the plugin root: `php tests/tier-capability-invariants.php`, `php tests/tier-instance-public-projection.php`, `php tests/tier-public-projection-is-addon.php`, `php tests/tier-pricing-parity.php`, `php tests/tier-edition-public-projection.php`, `npm run contract:cost-builder-isolation`, `npm run contract:tier-addon-flow`, `npm run contract:tier-edition-switch`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Rate Sheet](rate-sheet.md), [Tiers](tiers.md), [Tier Add-on Selection](tier-addon.md), [Tier Edition](tier-edition.md), and [Quote Builder](quote-builder.md).
