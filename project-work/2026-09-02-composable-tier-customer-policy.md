# Composable Tier — Phase 2A customer configuration policy

## Status
- **AWAITING CHATGPT REVIEW — Phase 2A plan below, no source touched.**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `1b2efd23064e3d2fac904c21fa4094912b132c41`.
- Phase 1 composable occupant architecture is **CLOSED** and must not be reopened without hard evidence.

## Locked starting point
The existing Tier System owns one subordinate `composable_occupant` outside the five fixed Tier slots. It reuses normal CZT/Edition/Commercial-Leg/Rate-Sheet lifecycle and editor machinery. Customer selections must never mutate that published occupant.

## Auditor quick source findings
1. `PackageFamilyPricingBuilder` already publishes active composable data as sibling `pricing.composable_offer`, using the same customer-safe `presentOccupant()` shape as normal occupants.
2. Frontend `PackageBuilderFamily` currently types only `pricing.tiers`; the composable sibling is therefore not yet a supported customer contract.
3. Current `composable_offer` is a **resolved declaration** (selected inclusions, current quantities/Price Options, Legs/terms). It is not an Admin-authored catalogue of what the customer may choose.
4. `FamilyTierQuoteItem` still requires fixed-slot `tierId: TierId`; `quoteItemKey()` classifies Family lines only as `:primary` or `:addon`. A composable line cannot safely coexist with a normal plan today without either abusing `isAddon` or colliding with `:primary`. Keep this deferred until after the policy contract.
5. Existing focused Family UI already consumes server-resolved Commercial Leg timelines and snapshots results at Add-to-Quote time. Reuse that resolver/display philosophy; do not create frontend pricing authority.

## Claude — Phase 2A planning task
Audit the relevant Package Station schema, Rate Sheet/Price Option structures, public Family projection, Package Builder customer path, and quote snapshot boundary. **Do not edit source.**

Return a concrete proposed contract covering:
- where the composable customer's **allowed-choice policy** is owned/persisted under the composable occupant;
- exact per-inclusion authorization shape: selectable/not selectable, default inclusion state, quantity default/min/max/step (or justify a different minimal model), and allowed Price Option IDs;
- how Editions interact with that policy: independent policy per Default/Edition vs inherited/overridden, with rationale;
- how Commercial Legs are exposed: customer chooses only Admin-authorized predefined commercial alternatives; customer must never create arbitrary Legs/cycles;
- minimum-price/floor semantics and where validation/pricing authority lives;
- customer-safe public projection shape, with Rate Sheet remaining upstream and never a consumer reference;
- server-side resolver/validation path that converts a customer choice into an immutable quote-time configuration snapshot without altering the occupant;
- backwards compatibility for Families with no composable offer/policy;
- the minimum Phase 2B UI contract that would consume this, but **no UI implementation plan beyond required data/actions**;
- explicit risks around Bundle rows, duplicate inclusion assignments across Legs, quantity pricing, unavailable Price Options, Edition switching, and stale browser choices after Admin changes.

Also state what must remain deferred to later phases: cart identity/coexistence, request schema, PDF/email, promotions.

Record your source evidence, proposed data shape, authoritative validation/resolver ownership, affected files/modules, migration/backfill position, and one recommended phased implementation sequence in this same work file. Set **AWAITING CHATGPT REVIEW**. No source branch, code changes, build, migration, or `main` push.

## Claude Report — Phase 2A

**Rung classification (per `compuzign-platform-architecture` skill):** the policy is **rung 1 (attribute)** throughout — no new Platform ID family. Every policy entry is keyed by an identity that already exists (`item_id`, `leg_platform_id`); nothing about the policy needs independent lookup outside its own occupant/Edition scope. No `PlatformIdentifierPolicy`/migration involvement.

**1. Ownership/persistence.** New sibling field `customer_policy` inside the composable occupant's existing occupant-shell (`TierInstanceSchema::sanitizeInstance()`'s `composable_occupant` branch), alongside `inclusions_override`/`rate_sheet_items`/`edition_options`/`legs`. Sanitized by a new `PackageManagerSchema::sanitizeCustomerPolicy()`, same layer that owns `sanitizeCommercialLegs()`/`sanitizeRateRows()`. No new controller section — folds into the existing `SECTION: COMPOSABLE_OCCUPANT` module save.

**2. Per-inclusion authorization shape** (keyed by existing `item_id`, never position/label):
`{ item_id, selectable: bool, default_selected: bool, quantity: {default,min,max,step} | null, allowed_price_option_ids: string[] | null }`. `quantity: null` = fixed at the row's own quantity; `allowed_price_option_ids: null` = only the row's default `unit_price`, no Price Option choice. This is one rung below Price Option's own rung-2 identity — pure attribute data about which already-identified options are authorized, never a new identity.

**3. Editions: independent policy per Default/Edition, not inherited.** Matches existing precedent — Editions already get full CRUD/lifecycle parity as independent occupant-shells (own `inclusions_override`/`legs`), never partial-inherit from Default. Inheriting here would require inventing a merge behavior nothing else in the codebase does, and risks ownership drift (an Edition's effective policy silently diverging from what's actually authored on it).

**4. Commercial Legs.** Policy references only already-resolved Leg identities (`leg_platform_id`, real `CZTL`/`CZTEL`) from the *existing* `resolveCommercialLegTimeline()` output — `commercial_legs_policy: { leg_platform_id, selectable }[]`, **Leg-scoped, not occupant-global** (a shared `item_id` can legally appear in multiple Legs per the cross-Leg-suppression precedent; a global flag would wrongly apply one bound to every Leg's own copy). No new Leg-creation path is ever exposed to a customer.

**5. Pricing/floor authority.** `PackageManagerSchema::projectTierRateSheetWith()`/`evaluateTierPricing()` stays the one price engine — policy only bounds *which* `{item_id, quantity, price_option_id}` tuples are legal; it never computes a price itself. An optional floor lives as the policy's own parent-owned field (e.g. `minimum_selection_price`), never derived by summing children client-side (echoes the commitment-anchor ownership bug, `architecture-examples.md` #7).

**6. Public projection.** New sibling `pricing.composable_offer_policy`, wired into `PackageFamilyPricingBuilder::buildResponse()` next to the existing `composable_offer` assignment, via a new `presentOccupantPolicy()`. Customer-safe: only already-exposed `item_id`/`leg_platform_id` references, no `rate_sheet_id`, Rate Sheet stays upstream-only.

**7. Resolver/freeze boundary.** New `PackageManagerSchema::resolveCustomerComposableSelection(policy, customerChoice): array` — validates the raw choice against the *live* policy, prices it through the existing engine, returns an immutable snapshot. Same "read once, freeze, never re-resolve" philosophy as `FamilyTierAdapter.tsx`'s `itemFor()`. Never mutates the occupant. Always re-validates against current policy at call time — never trusts a client-cached policy (covers the stale-choice risk below).

**8. Backwards compatibility.** Families with no composable offer: `composable_offer_policy` simply absent, identical to today's `composable_offer` optionality. Zero impact on Tier-only Families.

**9. Minimum Phase 2B UI contract (data/actions only).** (a) type `composable_offer_policy` on `PackageBuilderFamily.pricing` in `cost-builder.ts`; (b) client holds a *candidate* selection seeded from policy defaults, never a `FamilyTierQuoteItem`; (c) one server round-trip to the resolver above before any Add-to-Quote freeze — pricing/validation authority never moves to the frontend.

**10. Risks.** Bundle rows: policy must stay blind to `bundle_id` (rung-3 atom rule — no consumer learns Bundles exist). Duplicate `item_id` across Legs: handled by Leg-scoping (#4). Quantity pricing: policy bounds only, engine computes. Unavailable Price Options: resolver marks `available:false` at resolve-time (mirrors existing row `available` flag), never throws/substitutes. Edition switching: discard and re-default in-progress choice on Edition change — never carry one Edition's item_ids into another's policy scope. Stale browser choices: resolver always re-validates live policy (#7).

**Deferred (explicitly out of scope):** `FamilyTierQuoteItem`/`quoteItemKey()` cart coexistence (composable has no `TierId` slot to key on), `RequestSchema.php` persistence, PDF/email, promotions (`CZTP` reserved, unwired).

**Affected files/modules:** `TierInstanceSchema.php` (new field), `PackageManagerSchema.php` (`sanitizeCustomerPolicy()`, `resolveCustomerComposableSelection()`), `PackageFamilyPricingBuilder.php` (`buildResponse()` sibling), `cost-builder.ts` (new type). Not touched: `FamilyTierQuoteItem`, `quoteItemKey()`, `itemFor()` — deferred.

**Migration/backfill:** none — wholly new optional field, absent = today's behavior, no `PlatformIdentifierStation` involvement (no new identity family).

**Recommended sequence:** 2A contract (this) → 2B backend persistence/sanitize/projection/resolver + controller-level tests, no frontend → 2C policy-aware selection UI (candidate state + resolve round-trip), no cart/quote wiring → 2D `FamilyTierQuoteItem` coexistence (own audit) → 2E request schema/PDF/email/promotions.