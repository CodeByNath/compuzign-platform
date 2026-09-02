# Composable Tier Occupant — Customer Configuration Policy

**Phase 2A — backend policy/resolver slice only, no customer-facing UI or
cart/quote wiring.** Implements the accepted contract in
`project-work/2026-09-02-composable-tier-customer-policy.md`. See
[Composable Tier Occupant](tier-composable-occupant.md) for the occupant this
extends.

## Purpose and ownership

`customer_policy` is Admin-authorized bounds on which of an occupant's/
Edition's own already-published inclusions a future customer may choose, at
what quantity, and with which Price Option — never a second catalogue, never
mutable by a customer. Rung-1 attribute data (see
`compuzign-platform-architecture` skill): no new Platform ID family, keyed by
the container's own existing `item_id`/`price_option_id`.
`PackageSchema::sanitizeCustomerPolicy()` is structural only — it never
cross-references live `rate_sheet_items`/Price Options; that happens at
resolve time.

Commercial Leg structure is fixed this phase — a policy never mentions a Leg.
Source audit confirmed no alternate/parallel Leg-set concept exists anywhere;
Default and every Additional Leg are strictly time-scoped children of one
combined timeline ([Commercial Legs](commercial-legs.md)), so authorization
covers inclusions/quantity/Price-Option only.

## Persistence

Default occupant: `customer_policy` joins `TIER_MODULES` as a fifth module,
settled through the same draft → pending → settle lifecycle every other
module uses. The draft is wrapped (`{'value': <policy-or-null>}`) since a
sanitized policy can itself legitimately be `null` (explicitly cleared) —
the platform's own `drafts[$module] === null` already means "no pending
draft," so the two must never be conflated. `savePackageStationTierModule()`
(fixed-Tier/Add-on) explicitly rejects `customer_policy` as unknown — no
customer-choice concept exists there this phase, guarded rather than left to
fall through to the trailing FAQs branch.

Edition: travels through the existing single `overview` draft — no new
Edition module. **Absent/null inherits the occupant's Default policy
wholesale; non-empty is a COMPLETE replacement**, never a per-item patch — an
item in the Edition's own inclusions but absent from its own non-empty policy
defaults to excluded, never falling back to Default. Mirrors
`inclusions_override`'s existing empty-means-inherit precedent rather than a
new inheritance rule.

## Projection

`extractTierForCostBuilder()` re-sanitizes `customer_policy` at its own
whitelist boundary — an upstream field in storage is not automatically
visible downstream until named at every extraction step (architecture-
examples #8's class of gap). `publicTierEditionOptions()` re-sanitizes both
the inherited and Edition's-own branches identically — the resolver test file
itself initially caught the inherited branch returning the raw unsanitized
value instead.

`PackageFamilyPricingBuilder::presentOccupant()` — the one shared shape for
both `pricing.tiers[tierId]` and `pricing.composable_offer` — carries
`customer_policy` through generically, customer-safe by construction (keyed
only by already-exposed `item_id`/`price_option_id`, never a Rate Sheet id).
No separate top-level `composable_offer_policy` key — reuses the existing
shared shape instead of a composable-specific branch in `buildResponse()`.

## Resolver

`PackageManagerSchema::resolveCustomerComposableSelection(readModel,
container, choice)` never mutates `$container`. Builds an in-memory
customer-scoped copy of `rate_sheet_items[]`, hands it to the unmodified
`resolveCommercialLegTimeline()`/`projectTierRateSheetWith()` — no second
price engine.

- **Whole-inclusion exclusion is structural, not asserted:** `leg_assignments[]`
  lives nested inside its own row, so dropping that row for an excluded item
  removes it from Default's AND every Additional Leg's own component at
  once — it can never survive under a Leg while absent from the customer's
  own list.
- **Quantity/Price-Option customization stays scoped to the row's own
  top-level fields** — `leg_assignments[]` is never touched, so a Leg's own
  separately-authored values for that item stay exactly as authored.
- **Never a silent substitution:** an out-of-bounds quantity, a disallowed
  Price Option, or an unresolved published Price Option
  (`available:false`, mirroring `projectTierRateSheetWith()`) rejects the
  WHOLE selection with a structured `{item_id, reason}` list.
- **TCV floor:** compared against `computeResolvedTimelineTotalContractValue()`
  — sums resolved line totals, returns `null` (never a partial sum) when the
  timeline is open-ended. A configured floor against `null` rejects as
  `floor_unverifiable`, never silently skipped.

## Not yet built

Customer-facing selection UI (Phase 2B), `FamilyTierQuoteItem`/cart-key
coexistence (no `TierId` slot to key on), request-schema persistence,
PDF/email, promotions.

## Related Code Maps

[Composable Tier Occupant](tier-composable-occupant.md), [Composable Tier
Occupant Admin UI](tier-composable-occupant-admin-ui.md), [Composable Tier
Occupant — Tier Workspace UI](tier-composable-occupant-workspace-ui.md),
[Commercial Legs](commercial-legs.md), [Tier Edition](tier-edition.md),
[Rate Sheet](rate-sheet.md), [Rate Sheet Bundle](rate-sheet-bundle.md), and
[Cost Builder](cost-builder.md).
