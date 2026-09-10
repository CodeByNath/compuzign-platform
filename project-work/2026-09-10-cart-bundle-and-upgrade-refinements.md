# Cart Bundle + Upgrade Refinements

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `8406252c421f2adfb65eba5a54464b039f7f4550`.
- Review branch: `review/cart-bundle-upgrade-refinements` @ `9d3914724f1d1f0f7e86c6c03cb59c104360fbac`, exactly **1 ahead / 0 behind** production.
- **SOURCE PUSH NOT APPROVED.**

## Audit result
Both requested fixes are functionally correct.

### Bundle compact disclosure
`InclusionDisclosurePanel` now uses the already-carried `isChild` fact:
- Bundle parent keeps its real price/line total.
- Bundle children render **Included / Included**.
- Only non-child rows with an actual numeric `lineTotal` contribute to the compact Total.
- `undefined` can no longer reach the reducer or `formatPrice()`, removing `$NaN` / accidental `Contact Us` without globally treating unresolved rows as Included.

This preserves the established View Details Bundle semantics and keeps Cart quick view + Total Commitment aligned through the same shared renderer.

### Upgrade preservation + CTA
`replaceFamilyNormalQuoteItem()` now replaces only the primary and carries existing composable/Upgrade and add-on lines through unchanged. Tier/Edition swaps therefore preserve the exact Upgrade snapshot rather than repricing/rebuilding it.

Recommendations now suppresses the pending **Upgrade your build / Browse Catalogue** CTA when `selectedComposableItem` already exists. The guard is role-derived and narrowed to `pending`, so Manage build (`browsing`) still works. The CTA returns automatically after explicit Upgrade removal.

The old contract assertions that required Upgrade deletion on Tier/Edition swap encoded the superseded rule; their rewrites are accepted.

## Required correction before push approval
`quote.ts` still contains stale comments contradicting the accepted implementation:
1. `upsertFamilyComposableQuoteItem()` says the reverse direction — a primary being removed **or swapped** — drops the Upgrade via `replaceFamilyNormalQuoteItem()` / `removeFamilyTierSystemQuoteItems()`.
2. `removeFamilyComposableQuoteItem()` likewise says removing/**swapping** the primary drops it.
3. The new `replaceFamilyNormalQuoteItem()` doc says the Upgrade leaves only when explicitly removed/replaced, but whole-system primary removal still intentionally cascades through `removeFamilyTierSystemQuoteItems()`.

Correct only these comments so the rule is precise: **primary Tier/Edition replacement preserves Upgrade; removing the Family Tier system still removes it under the existing no-standalone-Upgrade rule.** No behavior change.

Then rebuild one clean candidate from current production `main` (single commit, 1 ahead / 0 behind), re-run the focused regression/contracts, and return at **AWAITING CHATGPT REVIEW**. Do not push `main`.

## Must preserve
Exact Upgrade snapshot on Tier/Edition swap; no duplicate CTA while Upgrade exists; Manage build; whole-system removal cascade; Bundle child Included semantics; genuine unresolved non-Bundle behavior; add-ons; cart ordering; pricing/Rate Sheet authority.

## Must not substitute
No route redesign, no Tier-attached Upgrade identity, no live repricing, no global `undefined => Included`, no disabling whole-system cleanup, no label matching.

## Note
`regression:composable-quote-cart-loop` is reported red on clean `main` as well. Treat as a separate baseline issue unless later evidence ties it to this candidate.
