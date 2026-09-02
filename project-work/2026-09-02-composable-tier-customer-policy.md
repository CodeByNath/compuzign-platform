# Composable Tier — Phase 2A customer configuration policy

## Status
- **READY FOR CLAUDE — audit and plan only; no source implementation.**
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