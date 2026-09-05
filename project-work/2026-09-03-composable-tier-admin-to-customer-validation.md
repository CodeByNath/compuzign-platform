# Upgrade journey — active correction track

## Status
- **READY FOR CLAUDE — review `1e99da02` rejected before push**
- Auditor verdict: **Proceed with safeguards**
- Production remains `main@a42eeba88c96d2e5d0a57cd498b270afe1e9baa1`, deploy `33964003314` / #953 successful.
- `1e99da02` is **NOT approved for main**.

## What passed
The prior structural drift is substantially corrected: live `PlanDetailsModal` and durable PDF/Review/View-Print now consume the same TS `periodBreakdownRows(buildQuotedCommercialBreakdown(...))` derivation; customer-facing range wording/payment facts/continuation suppression are centralized. Cart grouping also reuses the focused-Tier grouping helpers instead of another hand-copy.

## Remaining blockers
### 1. Bundle totals no longer match established View Details
`periodBreakdownRows()` computes `componentTotalValue()` by recursively flattening **Bundle children** and treating every child `lineTotal === null` as making the component total `To be confirmed`, then sums child line totals when present.

That is not `PlanDetailsModal`'s established rule. Its `periodItemsTotalDisplay(items)` sums **top-level priced component items only**; Bundle children are display-only and explicitly never folded into the total. This can turn a perfectly resolved priced Bundle into `To be confirmed` or double count child facts.

Fix: the durable customer-safe snapshot/presentation must preserve parent-vs-display-child semantics and compute/display the component inclusion total exactly like established View Details: top-level priced rows only. Do not price or sum Bundle children.

### 2. No-headline cart fallback still fabricates a base composition
`buildQuotedCartBreakdown()` currently does this when `headlineLegId` is absent/unresolved:
`groups.flatMap(...items...) -> baseInclusions`.

For a genuinely simple one-Leg Tier that is harmless, but for multiple resolved Legs with no trustworthy Headline identity it merges independent Leg claims into one fabricated base list. The previous instruction explicitly prohibited this.

Fix:
- one available group with no headline: its inclusions may be the base quick-view;
- multiple groups with no valid headline: return no derived cart breakdown and let the existing generic `inclusionItems/features` legacy fallback render; do not infer which Leg is base and do not merge Legs.

## Acceptance
1. Bundle parent priced row + display children produces the same component total as established View Details; children never contribute to or invalidate the total.
2. Multi-Leg/no-valid-headline fixture proves no fabricated merged base list.
3. Existing Starter Cloud cart remains base once + **Extensions billed Annually** → Static IP qty 2.
4. Existing detailed semantics remain: `Plan start–Month 10`, Period payment fact, Month 11 monthly continuation + new annual detail, no repeated unchanged monthly table.
5. Customer JSON remains ID-safe; no pricing/resolver/identity/mail-transport changes.

Report exact review SHA and focused tests, then set **AWAITING CHATGPT REVIEW**. Do not push source to `main`.