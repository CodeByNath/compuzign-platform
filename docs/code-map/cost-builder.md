# Cost Builder

## Purpose

Projects the active service catalogue, package tiers, bundles, promotions, and FAQs into the public interactive pricing and selection experience.

The additive Package Family customer builder follows a separate public read:
active Family → explicit assignment → active Tier Instance → compiled active
occupants. It never discovers a Tier Instance through a Service. Services remain upstream Rate
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

- [useCostBuilder.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useCostBuilder.ts) owns public projection loading, errors, refetch — fetch state.
- [PricingTiers.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/cost-builder/PricingTiers.tsx) renders Tier option cards, popular treatment, prices, inclusions, and selection buttons, splitting the one projected Tier map by `is_addon` into "Choose your Tier" (exclusive) and the **Recommendations** area, an extensible container whose first group is "Optional add-ons"; `recommendationsAside` places it as the trailing card — see [Tier Add-on Selection](tier-addon.md). `resolveEffectiveTierDisplay()` also drives an in-card, mutually-exclusive Tier Edition switch (`edition_options`) inside the same shared `TierCard` — never a second card or a different selected Tier — see [Tier Edition](tier-edition.md). Use it for customer Tier choice UI.
- [QuoteSummary.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/cost-builder/QuoteSummary.tsx) renders selected items, totals, remove actions, and request CTA. Use it for desktop quote summary behavior (`cost-builder.css`'s `@media (min-width:1024px)` clears `.cz-quote-summary__list`'s scroll cap so `.cz-cost-builder__sidebar` alone scrolls).
- [cartStorage.ts](../../wp-content/plugins/compuzign-platform/resources/ts/utils/cartStorage.ts) loads, saves, clears browser quote state — cart persistence format.
- `components/package-builder/PackageBuilderApp.tsx` owns the hero Family tabs
  and reuses `PricingTiers`, the shared cart, Quote Summary, and Request Flow.
  `FamilyTierAdapter.tsx` converts `EffectiveTierDisplay` into a `family_tier`
  snapshot and filters cards by `audience_groups[]`; no term/pricing logic.
  Package-Builder-only: Choose Plan swaps the strip for one Commercial-Legs-
  aware focused shell — see [Focused Shell](package-builder-focused-shell.md)
  and [Plan Details](plan-details.md). Add to Quote adds the line, then
  isolates the Tier and reveals Recommendations inside, stacking at 767px.
  `planDurationMonths` stays reserved/unpopulated — every caller passes `null`.
  Focused Family Categories follow compiled Tier inclusions → provenance →
  source Services, then deduplicate. Rate Sheets are never consumer
  references. Use component classes and atomic tokens; no inline styles.
  Upgrade Journey Finalisation (`finaliseUpgradeQuoteDraft()`/`deriveComposedProjection()` in `utils/quote.ts`): see [Quote Builder](quote-builder.md).

## Backend and Persistence

- [CostBuilderController.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Http/CostBuilderController.php) registers public projection and privileged import/dry-run routes. Use it for REST permissions, responses, and import endpoints.
- `PackageBuilderController.php` registers public read-only `GET
  /package-builder`; `PackageFamilyPricingBuilder.php` narrows the direct
  Family projection into customer Tier data without another pricing engine.
  Its additive `included_categories` field follows selected Tier inclusions to
  Service-owned Category names; it carries no mutation or pricing authority.
- [PricingBuilder.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Services/PricingBuilder.php) assembles categories, Services, Tiers, packages, promotions, bundles, and FAQs into the public response. Use it for projection and visibility/readiness rules.
- [ServiceRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Repositories/ServiceRepository.php) reads active Service posts, taxonomy, metadata, and pricing inputs. Use it for catalogue persistence queries.
- [cost-builder.ts](../../wp-content/plugins/compuzign-platform/resources/ts/api/endpoints/cost-builder.ts) exposes the typed public fetch. Use it for client response contracts.

Package Station resolves overlays before `PricingBuilder`: Service source → active Package Family → assignment → ready Tier instance. Cost Builder owns no Package rule. Missing or ambiguous edges mark covered Services unavailable, preventing legacy pricing from borrowing another Family's offer. `PricingBuilder::overlayPackage` copies each occupant's `is_addon`; no separate add-on collection exists. Occupant commercial terms remain the flat `price`/`billing_cycle`/`contact`/`inclusions` fields plus additive active `edition_options` — see [Tier Edition](tier-edition.md).

The Family-only response carries native IDs alongside existing Platform
business identifiers; these do not enter the Service-rooted response.

Unavailable Service responses expose no selectable Tier, bundle, promotion,
comparison, or quote offer.

## Runtime Flow

The hook fetches the public projection; selections persist locally before request handoff.

## Validation

From the plugin root: `php tests/tier-capability-invariants.php`, `php tests/tier-instance-public-projection.php`, `php tests/tier-public-projection-is-addon.php`, `php tests/tier-pricing-parity.php`, `php tests/tier-edition-public-projection.php`, `npm run contract:cost-builder-isolation`, `npm run contract:tier-addon-flow`, `npm run contract:tier-edition-switch`, `npm run contract:quote-sidebar-scroll`, `npm run contract:upgrade-quote-draft`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Rate Sheet](rate-sheet.md), [Tiers](tiers.md), [Tier Add-on Selection](tier-addon.md), [Tier Edition](tier-edition.md), [Commercial Legs](commercial-legs.md), [Package Builder Focused Shell](package-builder-focused-shell.md), [Plan Details](plan-details.md), and [Quote Builder](quote-builder.md).
