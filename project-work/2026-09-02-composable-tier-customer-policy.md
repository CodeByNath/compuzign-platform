# Composable Tier — Phase 2A customer configuration policy

## Status
- **READY FOR CLAUDE — contract correction only; no source implementation.**
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