# Composable Tier — Phase 2A customer configuration policy

## Status
- **CLOSED — Phase 2A backend accepted.**
- Auditor verdict: **Proceed**.
- Production `main`: `84af91931380c41217139ac546951e39879f0782`.
- Deploy to Hostinger run `33631303338` / #932 succeeded on that exact SHA.

## Accepted contract
- One composable-occupant-owned `customer_policy`; no new Platform ID family.
- Inclusion modes: `required | optional | excluded`; excluded means not offered.
- Quantity bounds and authorized Price Options are server-owned policy.
- Fixed Price Option preserves the published selection; choice mode accepts only explicitly authorized IDs and never null/base fallback.
- Commercial Legs remain fixed/non-customer-selectable.
- Whole-inclusion choice by `item_id`: excluding a row removes its nested Additional-Leg assignments; customer quantity/Price Option changes affect only the copied top-level row.
- Bundle parent remains one selectable commercial row; supplied children are display-only.
- Default policy is occupant-owned; Edition absent/empty inherits wholesale, non-empty Edition policy is complete replacement.
- Resolver operates on an in-memory copy; published occupant/Edition is never mutated.
- Stale/unknown/excluded/duplicate submitted choices reject; no silent substitution or partial acceptance.
- Save-time semantic validation rejects dangling item IDs and invalid/unresolvable Price Option references before persistence.
- Public `customer_policy` filters excluded entries; full stored policy remains server-side validation authority.

## Deferred finding
`minimum_total_contract_value` is **not shipped**. Audit proved `to_month` is inclusive while the existing customer TCV occurrence loop treats its effective end exclusively, creating a pre-existing potential off-by-one in multi-month payment counts. Resolve that separately before introducing any contract-value floor.

## Production verification
Auditor independently confirmed `main` points exactly to `84af91931380c41217139ac546951e39879f0782`. GitHub Actions Deploy to Hostinger #932 completed successfully with `head_sha` equal to that exact commit.

## Live validation
**Browser validation is not required for this backend-only phase.** No Admin policy editor or customer composability UI was introduced, so there is no new visual behavior to inspect. Meaningful runtime exercise of policy persistence/resolution would require mutating production policy records, which was not authorized. Existing Phase 1 visual behavior remains outside this slice and no frontend bundle was changed.

Phase 2A is accepted across architecture, reviewed source, exact `main` boundary and deployment. Later customer selection UI/cart coexistence must use a new work item.