# Cart Bundle + Upgrade Refinements

## Status
- **SOURCE PUSH APPROVED**
- Auditor verdict: **Proceed**.
- Production `main`: `8406252c421f2adfb65eba5a54464b039f7f4550`.
- Approved candidate: `review/cart-bundle-upgrade-refinements` @ `71773ead49c736aec8779ee57ccdf4f31d021470`.
- Tree: `4127e39c87b96226cdba37b64d3d6f12f90ea70d`.
- Independent GitHub compare: **1 ahead / 0 behind**, exact merge base production `8406252c`.

## Accepted fixes
### Bundle compact disclosures
The shared compact disclosure now uses existing `row.isChild` semantics:
- Bundle parent keeps resolved Unit price / Line total.
- Bundle children render **Included / Included**.
- Only non-child rows with numeric `lineTotal` contribute to compact Total.
- `undefined` no longer reaches `formatPrice()` or the reducer, removing accidental `Contact Us` and `$NaN`.
- Genuine unresolved non-Bundle rows remain unresolved; there is no global `undefined => Included` rule.

Cart quick view and Total Commitment remain aligned through the same shared renderer; established View Details behavior is unchanged.

### Upgrade preservation + CTA suppression
`replaceFamilyNormalQuoteItem()` now replaces only the primary. Existing composable/Upgrade and add-on lines for the same Family+Instance are carried through unchanged, so Tier or Edition swaps preserve the exact Upgrade snapshot.

Recommendations suppresses the pending **Upgrade your build / Browse Catalogue** CTA whenever `selectedComposableItem` already exists. The gate is role-derived, not label-matched, and applies only to `pending`; Manage build (`browsing`) remains available. The CTA returns after explicit Upgrade removal.

Whole-system removal still clears the Upgrade under the existing no-standalone-Upgrade rule. The old contract assertions requiring Upgrade deletion on Tier/Edition swap encoded the superseded rule; their rewrites are accepted.

## Independent review
GitHub confirms one clean candidate commit from current production. Scope is limited to the shared disclosure, Family primary replacement, Recommendations gate, focused regression/contracts, package script entry and rebuilt bundles. Claude reports the new 33-check regression, affected composable/cart/request contracts, TypeScript, build and docs green. Listed baseline failures reproduce on clean `main` and are not caused by this candidate.

## Must preserve
Exact Upgrade snapshot on Tier/Edition swap; no duplicate CTA while Upgrade exists; Manage build; whole-system removal cascade; Bundle parent pricing; Bundle-child Included semantics; unresolved non-Bundle behavior; add-ons; cart ordering; quote persistence; Rate Sheet authority.

## Must not substitute
No route redesign; no Tier-attached Upgrade identity; no live repricing/rebuild; no global unresolved-to-Included mapping; no disabling whole-system cleanup; no label matching.

## Claude — next action
Fast-forward **exactly `71773ead49c736aec8779ee57ccdf4f31d021470`** to `main` unchanged.

After push:
1. record exact `main` SHA/tree;
2. record `Deploy to Hostinger` run id + conclusion;
3. verify review branch is an ancestor of `main`, delete it local + remote;
4. set **AWAITING LIVE VALIDATION** and stop.

## Live validation
1. OMNIA Bundle compact view: parent priced, children Included/Included, Total correct, no `NaN`/`Contact Us`.
2. Same in Total Commitment disclosure.
3. Add Upgrade, switch Tier and Edition inside same Family: Upgrade remains unchanged.
4. With Upgrade already quoted, Recommendations shows no duplicate Upgrade CTA; Manage build still works; removing Upgrade makes CTA return.
