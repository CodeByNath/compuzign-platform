# Composable Tier Occupant — Customer Configuration Policy

**Phase 2A — backend policy/resolver slice only, no customer-facing UI or
cart/quote wiring.** Implements `project-work/2026-09-02-composable-tier-
customer-policy.md`. See [Composable Tier Occupant](tier-composable-occupant.md)
for the occupant this extends.

## Purpose and ownership

`customer_policy` is Admin-authorized bounds on which of an occupant's/
Edition's already-published inclusions a future customer may choose, at what
quantity and Price Option — never a second catalogue, never mutable by a
customer. Rung-1 attribute data (`compuzign-platform-architecture` skill): no
new Platform ID family, keyed by the container's own `item_id`/
`price_option_id`. `PackageSchema::sanitizeCustomerPolicy()` is structural
only; live cross-referencing is separate (Save-time validation below).

Commercial Leg structure is fixed this phase — a policy never mentions a Leg.
Source audit confirmed no alternate/parallel Leg-set concept exists; Default
and every Additional Leg are strictly time-scoped children of one combined
timeline ([Commercial Legs](commercial-legs.md)).

## Persistence

Occupant: `customer_policy` joins `TIER_MODULES` as a fifth module, settled
through the same draft → pending → settle lifecycle other modules use.
Draft wrapped (`{'value': <policy-or-null>}`) since a sanitized policy can
itself be `null` (explicitly cleared), distinct from `drafts[$module] ===
null` meaning "no draft." `savePackageStationTierModule()` (fixed-Tier/Add-on)
rejects it as unknown rather than falling into the trailing FAQs branch.

Edition: travels through the existing single `overview` draft — no new
module. **Absent/null inherits the occupant's Default policy wholesale;
non-empty is a COMPLETE replacement**, never a per-item patch — an item
absent from a non-empty Edition policy defaults to excluded, mirroring
`inclusions_override`'s empty-means-inherit precedent.

## No TCV floor — deferred, not shipped

The accepted contract originally required a `minimum_total_contract_value`
floor. Auditing Period boundary semantics proved `to_month` is unambiguously
INCLUSIVE (`commercialLegTimelinePeriods()`'s own `to_month + 1` boundary),
while the existing frontend TCV algorithm this work was told to reuse
(`buildOccurrenceMonths()`, `PricingTiers.tsx`) counts occurrences with an
exclusive-style loop bound against that inclusive value — undercounting a
finite monthly stream by one occurrence (11, not 12, over a nominal 12-month
window). A pre-existing discrepancy, live in the customer-facing Cost
Builder/quote/PDF display today, outside this slice's authority to correct.
The floor was removed entirely rather than shipped on disputed arithmetic.

## Save-time validation

`PackageManagerSchema::validateCustomerPolicyAgainstContainer(policy,
container, readModel)` — the live-data check `sanitizeCustomerPolicy()`
skips: every policy `item_id`, including `excluded` entries, must exist in
the container's current `rate_sheet_items`; every `choice`-mode Price Option
id must resolve against that row's own live `price_options[]`. Returns the
first violation; never repairs/drops one. Wired into
`saveComposableOccupantModule()` (against `current_occupant`) and
`saveComposableOccupantEditionModule()` (against the Edition's own current
fields, never the draft) — each builds `readModel` inline via
`buildReadModel()`, not a new signature through the shared
`settleTierSlot()`/`settleTierEditionOverview()`.

## Projection

`extractTierForCostBuilder()` re-sanitizes `customer_policy` at its own
whitelist boundary — a field in storage isn't visible downstream until named
at every extraction step (architecture-examples #8's class of gap).
`publicTierEditionOptions()` re-sanitizes both the inherited and
Edition's-own branches identically.

`PackageFamilyPricingBuilder::presentOccupant()` — the one shared shape for
`pricing.tiers[tierId]` and `pricing.composable_offer` (each
`edition_options[]` entry too) — carries `customer_policy` through a
dedicated `presentCustomerPolicy()` filter: customer-safe by construction
(never a Rate Sheet id) and by omission, stripping every `mode: excluded`
entry (not offered, never "visible and disabled"). Server validation still
sees the full stored policy; only this projection filters. No separate
top-level `composable_offer_policy` key.

## Resolver

`PackageManagerSchema::resolveCustomerComposableSelection(readModel,
container, choice)` never mutates `$container`; builds a customer-scoped copy
of `rate_sheet_items[]` and hands it to the unmodified
`resolveCommercialLegTimeline()`/`projectTierRateSheetWith()`.

- **Whole-inclusion exclusion is structural:** `leg_assignments[]` lives
  nested inside its own row, so dropping that row for an excluded item
  removes it from Default's AND every Additional Leg's own component at once.
- **Quantity/Price-Option customization stays scoped to the row's own
  top-level fields** — `leg_assignments[]` is never touched.
- **Every submitted choice is pre-validated:** a stale/unknown/not-offered or
  duplicate `item_id` rejects rather than being silently ignored or
  last-write-wins.
- **Never a silent substitution:** an out-of-bounds quantity, a disallowed
  Price Option — including an explicit `null` under `'choice'` mode, never
  automatically authorized (`'fixed'` preserves published null/base
  pricing) — or an unresolved Price Option rejects the WHOLE selection with a
  structured `{item_id, reason}`.

## Not yet built

`FamilyTierQuoteItem`/cart-key coexistence, request-schema/PDF/email/
promotions, and the TCV floor (above). Customer-facing selection UI is now
Phase 2B1 — see [Composable Tier Occupant — Customer UX](tier-composable-occupant-customer-ux.md).

## Related Code Maps

[Composable Tier Occupant](tier-composable-occupant.md), [Composable Tier
Occupant — Customer UX](tier-composable-occupant-customer-ux.md),
[Composable Tier Occupant Admin UI](tier-composable-occupant-admin-ui.md),
[Composable Tier Occupant — Admin Customer Selection Rules](tier-composable-occupant-admin-customer-policy.md),
[Composable Tier Occupant — Tier Workspace UI](tier-composable-occupant-workspace-ui.md),
[Commercial Legs](commercial-legs.md), [Tier Edition](tier-edition.md),
[Rate Sheet](rate-sheet.md), [Rate Sheet Bundle](rate-sheet-bundle.md), and
[Cost Builder](cost-builder.md).
