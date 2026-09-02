# Composable Tier — Phase 2A customer configuration policy

## Status
- **READY FOR CLAUDE — Phase 2A contract accepted; implement backend policy/resolver slice only.**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `1b2efd23064e3d2fac904c21fa4094912b132c41`.
- **SOURCE PUSH NOT APPROVED.** Work on a new review branch only.

## Accepted contract
- Policy is rung-1 attribute data owned by the composable occupant; no new Platform ID family.
- Default policy lives on the composable occupant. Each Edition may have its own policy: absent/empty = inherit Default wholesale; non-empty = complete replacement, never per-item merge. An Edition item absent from its complete replacement policy is excluded.
- Inclusion policy uses `required | optional | excluded`. Optional alone has `default_selected`.
- Quantity policy bounds default/min/max/step; null means fixed at the published row quantity.
- Price Option policy is `fixed | choice`. `fixed` means exactly the published row `price_option_id`, including null/base-unit-price. Never substitute silently.
- Commercial Leg structure is fixed. Customer never creates/toggles Legs.
- Customer selection is whole-inclusion by `item_id`: excluding a row removes its copied top-level row and nested `leg_assignments[]`, so it disappears from Default and every Additional Leg. Customer quantity/Price Option edits affect only the copied top-level row; Additional-Leg quantity/Price Option values remain Admin-authored.
- Bundle parent is one selectable commercial row; supplied children are display-only.
- Resolver operates on an in-memory copy only; published occupant/Edition is never mutated.
- Server revalidates current policy and returns structured rejection; never substitutes stale quantity/Price Option values.
- Optional `minimum_total_contract_value` uses the existing TCV aggregation semantics. A floor is invalid when the fixed Leg structure cannot yield TCV. **Save must reject that invalid floor; never ignore/drop it silently.** Resolver defensively returns top-level `floor_unverifiable` if stale invalid state somehow exists.
- Public policy exposes item/policy data only; no Rate Sheet IDs.
- Cart identity/coexistence, request schema, customer PDF/email and promotions remain deferred.

## Claude — implementation slice 2B-backend only
Create a new review branch from current `main`. Implement only:
1. persistence/sanitization of `customer_policy` on composable Default and Editions;
2. validation against each container's actual published `rate_sheet_items`/Price Options and fixed Leg structure;
3. customer-safe `composable_offer_policy` projection beside `composable_offer`;
4. server-side composable selection resolver using a copied row set and existing pricing/Commercial-Leg machinery;
5. structured validation outcomes, including required/optional/excluded, quantity bounds, Price Option authorization/unresolved and floor errors;
6. focused backend/controller contracts proving no occupant mutation, cross-Leg exclusion consistency, Edition inheritance/replacement, Bundle-parent behavior, stale choice rejection and TCV-floor rejection.

Do **not** implement customer UI, frontend candidate state, `FamilyTierQuoteItem`, cart keys, request schema, PDF/email or promotions. Do not alter Phase 1 architecture.

Update relevant Code Maps only if responsibilities/contracts change. Push only to the review branch, record exact branch/SHA/files/tests here, set **AWAITING CHATGPT REVIEW**, and stop. Do not push to `main`.