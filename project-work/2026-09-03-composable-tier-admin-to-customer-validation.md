# Upgrade journey — active correction track

## Status
- **AWAITING CHATGPT REVIEW**
- Production remains `main@a42eeba88c96d2e5d0a57cd498b270afe1e9baa1`, deploy `33964003314` / #953 successful.
- Review head `c513b516` on `review/upgrade-journey-finalisation` is **NOT approved for push**.

## Claude's report

### 1. Bundle totals fixed
`componentTotalValue()` (`resources/ts/utils/commercialLegPresentation.ts`) and its PHP mirror `emailComponentTotal()` (`NotificationTemplates.php`) no longer recurse into Bundle children. Both now sum/validate only the top-level `inclusions` array passed in — exactly `PlanDetailsModal.tsx`'s own `periodItemsTotalDisplay(items)` behavior (top-level items only; children are display-only, matching `ItemBreakdownTable`'s own "Included" cells for them). A Bundle parent's own resolved line total is now the whole component total regardless of what its children carry.

### 2. Multi-Leg cart fabrication fixed
`buildQuotedCartBreakdown()`'s no-headline branch now checks the group count:
- **Exactly one** resolved Leg group with no headline → that one group's claims become the base quick-view (nothing to disambiguate, still harmless).
- **Two or more** resolved Leg groups with no valid headline → returns `{ baseInclusions: [], extensionGroups: [] }` — no fabricated merge. `disclosureRowsForFamilyTierItem()` already treats an empty pair as absent and falls through to the existing generic `inclusionItems`/`features` fallback, so no caller-side change was needed.

### Validation
- `composable-quote-cart-contract.ts`: a Bundle parent (line total $100) + null-lineTotal child fixture proving the total is `$100.00`, never `To be confirmed`; the original multi-Leg-no-headline fixture now asserts an empty breakdown *and* full fallthrough to the generic `features` rendering; a new single-Leg-no-headline fixture proves that harmless case is untouched.
- `notification-templates-family-quote-parity.php`: the same Bundle fixture in both admin and customer email, asserting `Monthly total: $100.00` and no `To be confirmed` anywhere.
- Starter Cloud cart/detailed-semantics fixtures from the prior two rounds re-verified unchanged (base once + Extensions billed Annually; `Plan start–Month 10`; Payment Category/Active-payments fact lines; Month 11 continuation suppression).
- Full `tests/*.php` suite: same 5 pre-existing unrelated failures, plus the still-expected `d3eb4dc0`-excluded regression.
- Full 85-script `contract:*`/`regression:*` sweep: same 7 pre-existing unrelated failures.
- `tsc --noEmit` clean, `vite build` clean.

## Not independently verifiable without a live browser/real mail client
Same disclosure as prior rounds.

Review the exact SHA `c513b516` on `review/upgrade-journey-finalisation` (parent `1e99da02` → `0e0d4fc3` → `a42eeba8` → `main`) against the two bounded fixes above.
