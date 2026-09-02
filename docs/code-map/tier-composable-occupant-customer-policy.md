# Composable Tier Occupant — Customer Configuration Policy

**Phase 2A — backend policy/resolver slice only, no customer-facing UI or
cart/quote wiring.** Implements the accepted contract in
`project-work/2026-09-02-composable-tier-customer-policy.md`. See
[Composable Tier Occupant](tier-composable-occupant.md) for the occupant this
extends.

## Purpose and ownership

`customer_policy` is Admin-authorized bounds on which of an occupant's/
Edition's already-published inclusions a future customer may choose, at what
quantity, and with which Price Option — never a second catalogue, never
mutable by a customer. Rung-1 attribute data (`compuzign-platform-architecture`
skill): no new Platform ID family, keyed by the container's own existing
`item_id`/`price_option_id`. `PackageSchema::sanitizeCustomerPolicy()` is
structural only; live cross-referencing is a separate step (Save-time
validation below).

Commercial Leg structure is fixed this phase — a policy never mentions a Leg.
Source audit confirmed no alternate/parallel Leg-set concept exists anywhere;
Default and every Additional Leg are strictly time-scoped children of one
combined timeline ([Commercial Legs](commercial-legs.md)).

## Persistence

Occupant: `customer_policy` joins `TIER_MODULES` as a fifth module, settled
through the same draft → pending → settle lifecycle every other module uses.
Draft wrapped (`{'value': <policy-or-null>}`) since a sanitized policy can
itself be `null` (explicitly cleared), distinct from `drafts[$module] ===
null` meaning "no draft." `savePackageStationTierModule()` (fixed-Tier/Add-on)
explicitly rejects it as unknown rather than falling into the trailing FAQs
branch.

Edition: travels through the existing single `overview` draft — no new
Edition module. **Absent/null inherits the occupant's Default policy
wholesale; non-empty is a COMPLETE replacement**, never a per-item patch — an
item absent from a non-empty Edition policy defaults to excluded. Mirrors
`inclusions_override`'s existing empty-means-inherit precedent.

## Save-time validation

`PackageManagerSchema::validateCustomerPolicyAgainstContainer(policy,
container, readModel)` — the live-data check `sanitizeCustomerPolicy()`
deliberately skips: every policy `item_id` must exist in the container's own
current `rate_sheet_items`; every `choice`-mode Price Option id must resolve
against that row's own live `price_options[]`; a configured
`minimum_total_contract_value` is rejected if the container's own fixed Leg
structure can't yield a finite total (checked unfiltered — open-endedness
never depends on item selection). Returns the first violation; never
repairs/drops one. Wired into both `saveComposableOccupantModule()` (against
the occupant's `current_occupant`) and `saveComposableOccupantEditionModule()`
(against the Edition's own current fields, never the in-flight draft) — each
builds a fresh `readModel` inline via `buildReadModel()`, matching this
controller's existing pattern rather than a new signature threaded through
the shared, composable-agnostic `settleTierSlot()`/`settleTierEditionOverview()`.

## Projection

`extractTierForCostBuilder()` re-sanitizes `customer_policy` at its own
whitelist boundary — a field in storage isn't visible downstream until named
at every extraction step (architecture-examples #8's class of gap).
`publicTierEditionOptions()` re-sanitizes both the inherited and
Edition's-own branches identically — the resolver test initially caught the
inherited branch returning raw unsanitized data instead.

`PackageFamilyPricingBuilder::presentOccupant()` — the one shared shape for
`pricing.tiers[tierId]` and `pricing.composable_offer` — carries
`customer_policy` through generically, customer-safe by construction (never a
Rate Sheet id). No separate top-level `composable_offer_policy` key.

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
- **Every submitted choice is pre-validated** against the effective policy
  and the container's current rows: a stale/unknown/not-offered `item_id`, or
  a duplicate in one submission, rejects rather than being silently ignored
  or last-write-wins.
- **Never a silent substitution:** an out-of-bounds quantity, a disallowed
  Price Option — including an explicit `null` under `'choice'` mode, never
  automatically authorized (`'fixed'` mode is the route that preserves
  published null/base pricing) — or an unresolved published Price Option
  rejects the WHOLE selection with a structured `{item_id, reason}`.
- **TCV floor:** `computeResolvedTimelineTotalContractValue()` — a faithful
  PHP port of the canonical `buildLegPaymentSummaries()`/
  `computeTotalContractValue()` algorithm (`PricingTiers.tsx`/
  `paymentSummary.ts`), accounting for billing cadence/occurrence count per
  stream, not a per-Period line-total sum (the first cut's flaw). Returns
  `null` the instant any stream is open-ended; a configured floor against
  `null` rejects as `floor_unverifiable`, at save time and defensively at
  resolve time.

## Not yet built

Customer-facing selection UI (Phase 2B), `FamilyTierQuoteItem`/cart-key
coexistence, request-schema persistence, PDF/email, promotions.

## Related Code Maps

[Composable Tier Occupant](tier-composable-occupant.md), [Composable Tier
Occupant Admin UI](tier-composable-occupant-admin-ui.md), [Composable Tier
Occupant — Tier Workspace UI](tier-composable-occupant-workspace-ui.md),
[Commercial Legs](commercial-legs.md), [Tier Edition](tier-edition.md),
[Rate Sheet](rate-sheet.md), [Rate Sheet Bundle](rate-sheet-bundle.md), and
[Cost Builder](cost-builder.md).
