# Commercial Legs

## Purpose and ownership

Rate Sheets remain the atomic pricing source of truth; Commercial Legs never
recompute or duplicate a row's own price. Tier occupants and Tier Editions
own commercial composition — Editions remain vertical variants (e.g. a
different Rate Sheet binding or presentation), never the mechanism for
multi-cycle billing. Every Tier occupant/Edition carries a born-with
**Default Leg** (its own existing `billing_cycle`/`from_month`/`to_month`/
`legs[]` fields) plus zero or more **Additional Legs** — independent,
time-scoped commercial children of the same parent, never a base-plus-
modifier hierarchy.

## Identity

Tier Leg identity is `CZTL`; Tier Edition Leg identity is `CZTEL`. The
Default Leg is not exempt: it carries a real, minted `default_leg_platform_id`
(`CZTL`/`CZTEL`) like any Additional Leg. The literal string `'default'` is
only an internal backend bucketing/matching key
(`commercialLegTimelineChildren()`) — resolved output never exposes it once
a real identity exists; it is a legacy-data fallback only. Matching an
inclusion's `leg_assignments[].leg_platform_id` to an Additional Leg is
always by that real Platform ID, never positional `leg_index`.

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
value itself, never derived from a Leg's own `from_month` (commitment 48
means cap 48 whether a Leg starts at 0, 5, or 12).
`clampCommercialLegTimelineToCommitment()` applies this cap last, over the
fully-resolved timeline. Legs may start late, end early, overlap, or sit
entirely mid-commitment; there is no gap-fill requirement and no "one Leg
must reach the end" rule. `Indefinite` (`to_month === null`) stays
authorable and resolves capped at the parent boundary. An explicit numeric
`to_month` above the cap is rejected: `PackageManagerSchema::
checkFiniteCommitmentLegCap()` blocks it at `settleTierSlot()`/
`settleTierEditionOverview()`, and both `CommercialLegCard` editors
(`TierPricingRulesEditor.tsx`, `TierEditionOverviewFields.tsx`) cap manual
numeric entry to the same value client-side.

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

`headline_leg_id` — a Rung-1 presentation pointer, stored independently on
the occupant and on each Edition — never a pricing concept, never touching
`resolveCommercialLegTimeline()` itself. A checkbox on each `CommercialLegCard`
marks exactly one Leg (Default or one Additional) as Headline; Default is
the out-of-box choice (stored `''`). It shares the identity space
`commercial_legs[].components[].source` already uses, rewritten at Publish
by `PackageStationController::rewriteHeadlineLegId()` from the same
`reservations` `reserveTierLegPlatformIds()` already returns — no separate
mechanism. `extractTierForCostBuilder()` never exposes the raw `''` state:
it resolves to the real `default_leg_platform_id` (else `'default'`),
matching the Default component's own `source`. The frontend
(`resolveHeadlinePrice()`, `PricingTiers.tsx`) does the identity-match lookup
itself and wins over a selected Commercial Period for the card's headline
price/`billing_cycle` (Period still governs that period's own inclusions).

## Debug tool

Package Settings → Maintenance → Commercial Legs Debug
(`CommercialLegsDebugPanel.tsx`) runs the same real customer projection
path (`findAllActiveFamiliesForCostBuilder()`) — no separate calculation —
and renders Family → Tier → Period → Leg → Inclusion. Period headers alone
state the effective resolved window; components no longer print a
duplicate `own range`.

## Platform ID migration

`TIER_LEG`/`TIER_EDITION_LEG` are first-class scopes in the existing
`admin/platform-identifiers/migration` dry-run → assign action
(`TemporaryMigrationController`), reusing the `tierLeg()`/
`tierEditionLeg()` adapters already used for live Publish-time reservation.
No separate backfill script exists.

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

[Tiers](tiers.md), [Tier Edition](tier-edition.md), [Package Home Settings](package-settings.md), [Platform Identifier Station](platform-identifier-station.md), and [Cost Builder](cost-builder.md).
