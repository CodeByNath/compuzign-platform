# Composable Tier — Phase 2A customer configuration policy

## Status
- **SOURCE PUSH APPROVED — exact review head only.**
- Auditor verdict: **Proceed with safeguards**.
- Production base independently verified: `main@1b2efd23064e3d2fac904c21fa4094912b132c41`.
- Approved review branch: `review/composable-tier-customer-policy@84af91931380c41217139ac546951e39879f0782`.
- Branch is exactly 3 commits ahead / 0 behind production base.

## Accepted Phase 2A backend contract
- One composable-occupant-owned `customer_policy`; no new Platform ID family.
- Inclusion modes: `required | optional | excluded`; excluded means not offered.
- Quantity bounds and authorized Price Options are server-owned policy.
- Fixed Price Option preserves the published selection; choice mode accepts only explicitly authorized IDs and never null/base fallback.
- Commercial Legs remain fixed and non-customer-selectable.
- Whole-inclusion selection by `item_id`: excluding a row removes its nested Additional-Leg assignments too; customer quantity/Price Option changes affect only the copied top-level row.
- Bundle parent remains one selectable commercial row; supplied children are display-only.
- Default policy is occupant-owned; Edition absent/empty inherits it wholesale, non-empty Edition policy is complete replacement.
- Resolver works on an in-memory copy; never mutates published occupant/Edition.
- Stale/unknown/excluded/duplicate customer choices reject structurally; no silent partial acceptance/substitution.
- Save-time semantic validation rejects dangling item IDs and invalid/unresolvable Price Option policy references before persistence.
- Public `customer_policy` filters `excluded` entries; full stored policy remains server-side validation authority.
- `minimum_total_contract_value` is **deferred/not shipped**. Audit proved `to_month` is inclusive while existing frontend occurrence counting treats its effective end exclusively, creating a pre-existing TCV off-by-one risk. Do not introduce a floor until that separate customer TCV issue is resolved.

## Independent source review
Full base→head scope is limited to Package policy/schema/controller/projection, focused tests and Code Maps. No UI, `FamilyTierQuoteItem`, cart keys, request schema, PDF/email or promotions changes.

Auditor independently confirmed the final correction removes the disputed TCV helpers/floor, filters excluded policy rows from occupant and Edition public projections, and validates excluded stored references rather than allowing stale entries.

## Claude next action
Push **exact commit `84af91931380c41217139ac546951e39879f0782`** to `main` (fast-forward only; no extra source changes). Record the resulting exact `main` SHA and push result here, set **AWAITING CHATGPT REVIEW**, then stop. Do not begin customer UI/cart work. Deployment/live validation will be reviewed separately after the `main` boundary is confirmed.