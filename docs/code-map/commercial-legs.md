# Commercial Legs

## Purpose and ownership

Rate Sheets remain the atomic pricing source of truth; Commercial Legs never
recompute or duplicate a row's own price. Tier occupants and Tier Editions
own commercial composition — Editions remain vertical variants, never the
mechanism for multi-cycle billing. Every Tier occupant/Edition carries a
born-with **Default Leg** plus zero or more **Additional Legs** —
independent, time-scoped commercial children of the same parent, never a
base-plus-modifier hierarchy.

## Identity

Tier Leg identity is `CZTL`; Tier Edition Leg identity is `CZTEL`. The
Default Leg is not exempt: it carries a real, minted `default_leg_platform_id`
like any Additional Leg. The literal string `'default'` is only an
internal backend bucketing/matching key (`commercialLegTimelineChildren()`)
— a legacy-data fallback only, never exposed once a real identity exists.
Matching an inclusion's `leg_assignments[].leg_platform_id` to an
Additional Leg is always by that real Platform ID, never positional
`leg_index`.

## Resolver

`PackageManagerSchema::resolveCommercialLegTimeline()` segments every
child's own `from_month`/`to_month` into periods, and for every active
child independently buckets and prices its own inclusions through the
unchanged `projectTierRateSheetWith()`/`evaluateTierPricing()`:

```text
Period
  → Leg component identified by CZTL/CZTEL
      → priced inclusions
```

Two active identities (Default included) carrying the same Rate Sheet
inclusion is never a collision — each resolves its own independent
component; there is no cross-Leg suppression by `item_id` or
`price_option_id`, and no precedence ordering. Default and Additional Legs
may freely overlap. A Rate Sheet row keeps its own source-item identity
throughout; Leg identity adds commercial context, never replaces it.

## Commitment

A finite commitment (`minimum_term_unit === 'month'`) belongs to the
parent Tier/Edition, never to any one Leg — the cap is the commitment
value itself, never derived from a Leg's own `from_month`.
`clampCommercialLegTimelineToCommitment()` applies this cap last, over the
fully-resolved timeline. Legs may start late, end early, overlap, or sit
mid-commitment; there is no gap-fill requirement. `Indefinite`
(`to_month === null`) stays authorable, resolved capped at the parent
boundary. An explicit numeric `to_month` above the cap is rejected:
`checkFiniteCommitmentLegCap()` blocks it at settle time, and both
`CommercialLegCard` editors cap manual entry to the same value client-side.

## Leg range authoring

`from_month = 0` is valid and means Plan start, never normalized to `1`.
Annual/Yearly offers only 12-month cadence points from the Leg's OWN start
(`yearlyLegToMonthChoices()`, `tierDetailModel.ts`: start 11, cap 48 →
23/35/47 only, never an injected off-cadence `48`). Monthly/Weekly/Daily
share one unrestricted free-entry model (no invented week/day conversion).
One-time/Upfront are a single point, never cadence-multiplied.

**Commitment coverage is intended architecture, not yet enforced:** at
least one Leg should start at Plan start and at least one (possibly
different) Leg should reach commitment end. No collection-level check
exists — `checkFiniteCommitmentLegCap()` explicitly does not require it.

## Cost Builder and public projection

`resolveCommercialLegTimeline()`'s output is additive: the existing flat
`price` field is untouched. `PackageRepository::
projectTierInstanceForCostBuilder()` attaches it as `commercial_legs` for
the Tier occupant and each `edition_options[]` entry, exposed publicly
alongside `price` (`PackageFamilyPricingBuilder`/`PricingBuilder`).
`PackageSchema::extractTierForCostBuilder()` carries the occupant's own
`default_leg_platform_id` through to the resolver so its emitted component
identity is the real Leg, not the internal fallback.

## Headline Leg (customer-UI presentation metadata)

`headline_leg_id` — a presentation pointer stored independently on the
occupant and each Edition, never a pricing concept, never touching
`resolveCommercialLegTimeline()` itself. A checkbox on each
`CommercialLegCard` marks exactly one Leg as Headline; Default is the
out-of-box choice (stored `''`), rewritten at Publish to the real Leg
identity `commercial_legs[].components[].source` already uses. The
frontend (`resolveHeadlinePrice()`, `PricingTiers.tsx`) does the identity-
match lookup and wins over a selected Commercial Period for the card's
headline price/`billing_cycle` (Period still governs its own inclusions).

## Debug tool

Package Settings → Maintenance → Commercial Legs Debug
(`CommercialLegsDebugPanel.tsx`) runs the same real customer projection
path — no separate calculation — rendering Family → Tier → Period → Leg →
Inclusion.

## Platform ID migration

`TIER_LEG`/`TIER_EDITION_LEG` are first-class scopes in the existing
platform-identifier migration dry-run → assign action, reusing the same
adapters live Publish-time reservation already uses. No separate backfill
script exists.

## Authoritative files

| Area | Files |
|---|---|
| Resolver/commitment | `PackageManagerSchema.php` — `resolveCommercialLegTimeline()`, `checkFiniteCommitmentLegCap()`, `clampCommercialLegTimelineToCommitment()` |
| Identity/settle | `PackageSchema.php` (Leg sanitize/reattach/prune), `PackageStationController.php` (`reserveTierLegPlatformIds()`, `rewriteHeadlineLegId()`) |
| Cost Builder | `PackageRepository.php`, `PackageFamilyPricingBuilder.php`, `PricingBuilder.php`, `PricingTiers.tsx` (`resolveHeadlinePrice()`) |
| Migration | `TemporaryMigrationController.php`, `PackagePlatformIdentifierAdapters.php` |
| Debug tool | `CommercialLegsDebugPanel.tsx` |
| Editors | `TierPricingRulesEditor.tsx`, `TierEditionOverviewFields.tsx` |
| Tests | `commercial-leg-resolution.php`, `tier-commercial-leg-identity.php`, `commercial-leg-timeline.php`, `commercial-leg-commitment-cap.php`, `tier-leg-inclusion-reference.php`, `tier-leg-platform-identity.php`, `tier-leg-assignment-orphan-pruning.php`, `tier-default-leg-identity-cost-builder.php`, `commercial-leg-headline-id.php`, `platform-identifier-temporary-migration.php` |

## Related Code Maps

[Tiers](tiers.md), [Tier Edition](tier-edition.md), [Package Home Settings](package-settings.md), [Platform Identifier Station](platform-identifier-station.md), [Cost Builder](cost-builder.md), [Package Builder Focused Shell](package-builder-focused-shell.md), and [Plan Details](plan-details.md).
