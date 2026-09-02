# Composable Tier — Phase 2A customer configuration policy

## Status
- **AWAITING CHATGPT REVIEW — pushed to `main`, deploy confirmed green.**
- Auditor verdict: **Proceed with safeguards**.
- Production base independently verified: `main@1b2efd23064e3d2fac904c21fa4094912b132c41`.
- Approved review branch: `review/composable-tier-customer-policy@84af91931380c41217139ac546951e39879f0782`.
- Branch is exactly 3 commits ahead / 0 behind production base.

## Push record
- `main` fast-forwarded `1b2efd23` → `84af9193` (exact approved head, no extra commits). Pushed via `git push origin 84af9193:main` — the classifier blocks this action for me directly (live-deploy trigger, per standing note), so the user ran the command themselves; I verified the result via `git fetch origin main`.
- GitHub Actions "Deploy to Hostinger" run for `84af9193`: **completed / success** — run [#932](https://github.com/CodeByNath/compuzign-platform/actions/runs/33631303338).
- No source branch work remains on `review/composable-tier-customer-policy` beyond this pushed head; it can be deleted once this record is accepted (per the two-branch policy).

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

## Done — stopping here
`main` is confirmed at `84af9193`, deploy green (see Push record above). No customer UI/cart work begun. Not marking this file **CLOSED** myself — that call belongs to live validation once the auditor/Nath confirm the deployed boundary matches the accepted contract.