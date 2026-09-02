# Composable Tier — Phase 2A customer configuration policy

## Status
- **AWAITING CHATGPT REVIEW — correction below, no source touched.**
- Auditor verdict: **Proceed with safeguards — plan not accepted yet.**
- Production `main`: `1b2efd23064e3d2fac904c21fa4094912b132c41`.
- Phase 1 architecture is CLOSED.

## Accepted direction from Claude's first plan
- Policy is occupant/Edition-owned attribute data; no new Platform ID family.
- Customer never mutates the published composable occupant.
- Rate Sheet remains upstream pricing source; customer never references it directly.
- Server revalidates live policy and resolves pricing before any quote freeze.
- Default and each Edition should own independent policy unless hard source evidence requires inheritance.
- Cart identity/request/PDF-email/promotions remain deferred.

## Blocking contract ambiguities
### 1. Inclusion state is underspecified
`selectable: bool` + `default_selected: bool` cannot unambiguously represent **required**, **optional**, and **not offered**. `selectable:false` could mean either "always included" or "customer cannot buy it".

Replace this with an explicit minimal state model, preferably something equivalent to `mode: required | optional | excluded`, with default selection meaningful only for optional rows. Explain how the occupant's current declaration relates to the customer defaults.

Also tighten `allowed_price_option_ids`: `null = row default unit_price` is too vague because existing Rate Sheet selections can already carry a selected `price_option_id`. Define exactly whether "fixed" means the occupant/Edition's published selection, Rate Sheet base price, or another source. Never silently substitute one.

### 2. Do not make Commercial Legs independently customer-selectable
A set of Legs may jointly define one commercial contract (e.g. upfront + monthly + annual, overlapping Periods). `{leg_platform_id, selectable}` would allow a customer to drop one required charge and accidentally manufacture a commercial structure Admin never authored.

Leg identity remains the pricing/resolution boundary, but customer authorization must operate on **complete predefined commercial choices/configurations**, not arbitrary Leg on/off switches. Audit the existing resolver and propose the smallest representation for an Admin-approved complete commercial alternative. If the current composable occupant has only one authored Leg set, the correct Phase 2A answer may simply be "Leg structure is fixed; customer chooses inclusions/qty/Price Options only" until a real second commercial configuration exists. Do not invent a generic combination engine.

### 3. `minimum_selection_price` has no unit/basis
A scalar floor is undefined when the resolved selection has multiple streams (upfront/monthly/yearly) and potentially a commitment. Do not compare unlike billing cycles or headline figures.

Audit current pricing/TCV machinery and recommend one explicit floor semantics, with authority and calculation basis. Examples to evaluate, not assume: per-Leg minimum; per-cycle minimum; or minimum resolved contract value over the parent commitment. If existing source has no safe canonical aggregate for this point in the flow, defer floor support rather than inventing client/server arithmetic.

## Claude — correction report only
Return a revised Phase 2A contract addressing the three blockers above plus:
- exact persistence location for Default policy and each Edition policy;
- exact stale/unavailable behavior: reject with structured validation outcome, never silently substitute a Price Option/quantity/Leg;
- Bundle parent behavior (one selectable commercial row; supplied children display-only);
- whether duplicate `item_id` across Legs requires policy key `(leg identity, item_id)` rather than `item_id` alone;
- proposed public policy shape with no Rate Sheet IDs;
- exact server resolver input/output boundary, still no cart type work.

Keep this planning-only. Update this same file, set **AWAITING CHATGPT REVIEW**, and do not create a source branch or change/build source.

## Claude Report — correction (re-audited against live source, not the prior draft)

**Blocker 2 resolved by source evidence, not judgment call.** `PackageSchema::sanitizeCommercialLegs()` emits only `{id, sort_order, billing_cycle, from_month, to_month, platform_id}` — no group/variant/config field anywhere, and `resolveCommercialLegTimeline()` flattens Default + every Additional Leg into ONE combined timeline (confirms [[commercial-legs-pricing-boundary]]: each active Leg is a time-scoped child, never a mutually-exclusive alternative). There is no second authored commercial structure to choose between. **Adopted verbatim: Leg structure is fixed. Customer policy covers inclusions/quantity/Price-Option only, not Legs, in Phase 2A.** No combination engine.

**Blocker 1 resolved.** Per-inclusion shape, replacing `selectable/default_selected`:
```
{ item_id,
  mode: 'required' | 'optional' | 'excluded',
  default_selected: bool,        // meaningful only when mode === 'optional'
  quantity: {default,min,max,step} | null,     // null = fixed at the row's own declared top-level quantity
  price_option: {
    mode: 'fixed' | 'choice',
    allowed_price_option_ids: string[] | null, // 'choice' only; each must exist in the row's own price_options[]
    default_price_option_id: string | null      // 'choice' only
  } }
```
`excluded` = never appears in the customer projection or resolver input at all (not "included, not togglable" — genuinely not offered). `price_option.mode:'fixed'` resolves to exactly the row's own already-published top-level `price_option_id` (`PackageSchema.php:98-101`) verbatim — including when that's itself `null` (row's base `unit_price`) — never re-derived or defaulted differently. This removes the prior ambiguity: "fixed" always means "whatever Admin's own Default/Edition declaration on this row already is," never Rate Sheet base price by assumption.

**Duplicate `item_id` across Legs — key by `item_id` alone, not `(leg, item_id)`.** `leg_assignments[]` (`PackageSchema.php:91-95`) already carries its own separate `quantity`/`price_option_id` per Leg, independent of the row's top-level Default values (`PackageSchema.php:98-101`) — and since Legs are fixed (not customer-facing this phase), a Leg's own assignment override is entirely Admin-authored and untouched by policy regardless. Policy only ever governs the Default-level declaration, so `item_id` alone is sufficient and correct.

**Bundle — no special case needed, confirmed structural.** `consumableRateSheetRows()`/`linkBundleRows()` never expand a Bundle into multiple occupant-level rows; `supplied_content[]` lives only on the Rate Sheet's own Bundle record. A policy entry is 1:1 with an occupant `rate_sheet_items[]` row, so "one selectable commercial row, children display-only" is automatic — nothing bundle-aware needs to be written into the policy shape.

**Persistence — reuses existing Edition-inheritance precedent, not invented independence.** `customer_policy` is a sibling field: on the occupant's own top-level shell (next to its own `rate_sheet_items`) for Default; on each `tier_editions[]` entry (`sanitizeTierEdition()`, keyed by the Edition's own internal `id`, not array index) for that Edition. Found hard evidence against pure independence: `inclusions_override` on an Edition already uses "empty array = inherit the parent occupant's" (`PackageSchema.php:1687-1689`). `customer_policy` mirrors that exact convention — empty/absent inherits the occupant's Default policy; non-empty overrides per item for that Edition. Consistent with existing precedent rather than a new inheritance rule.

**Floor — minimum Total Contract Value, reusing the existing aggregator, not a new scalar.** `computeTotalContractValue()` already exists in two mirrored places (`paymentSummary.ts:44-47`, `NotificationTemplates.php:210-221`): sums per-Leg-stream subtotals, returns `null` if any stream is open-ended. Proposed: `minimum_total_contract_value: number | null` on the policy (parent-owned, occupant/Edition level, never per-Leg). Resolver compares the customer's own resolved selection's TCV (same aggregator, same null-propagation) against this floor; if the resolved TCV is `null` (an open-ended stream present), floor validation is skipped — deferred, never invented arithmetic — exactly as the auditor asked.

**Stale/unavailable behavior — mirrors existing `available`/`health_reasons`, never substitutes.** `projectTierRateSheetWith()` already keeps an unresolved-Price-Option row with `available:false`, `unit_price:null`, `health_reasons += 'price_option_unresolved'` rather than dropping or falling back (`PackageManagerSchema.php:1819-1846`). The new resolver reuses this vocabulary: a customer choice failing policy bounds returns a structured rejection per item (`item_id`, reason code: `not_selectable | quantity_out_of_bounds | price_option_not_allowed | price_option_unresolved`) — never a silent substitution, never a partial accept.

**Resolver boundary.** Input: `{item_id, quantity, price_option_id}[]` — the same triple the platform already uses everywhere for Tier selection (no new shape). Output: either a fully resolved snapshot (same row shape as `projectTierRateSheetWith()`: `item_id, quantity, price_option_id, unit_price, line_total, available, health_reasons`, plus resolved `total_contract_value`), or a structured per-item rejection list as above. Legs are never part of resolver input — their timeline is fixed and merges around whatever items the customer's resolved selection includes.

**Public policy shape** (no Rate Sheet IDs, only already-exposed `item_id`s): `{ items: [{item_id, mode, default_selected, quantity, price_option}], minimum_total_contract_value }`.

Everything else from the first plan (rung-1 classification, no new Platform ID family, cart/request/PDF/promotions deferred) stands unchanged.