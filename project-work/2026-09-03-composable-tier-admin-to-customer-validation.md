# Upgrade journey — active correction track

## Status
- **READY FOR CLAUDE — deployed live gate failed; include cart hierarchy correction in this round**
- Auditor verdict: **Proceed with safeguards**
- Deployed source: `main@2b3ec74d0d11798ee6c633a546bfd7d15b87467a`
- Deploy run `33941331424` is successful/live.

## Current live fixes required
### Customer email structure
Render each quoted item as its own clearly bounded email-safe HTML section. Preserve existing labels, prices, quantities and responsive/email-client-safe markup. Add consistent visible separation between item header/inclusions and the next quoted item.

### Complete Total Commitment
Build Total Commitment from the complete authoritative Family quote collection. Include each primary, Upgrade and add-on exactly once. Aggregate each item's existing `legPaymentSummaries` using the accepted payment-summary helpers; no second pricing calculator and no inference from visible tabs. Each disclosure must resolve only that item's stored inclusion snapshot.

Current source evidence: `QuoteDetailsOverlay.tsx` deliberately filters Total Commitment to `!item.isAddon`; that is the omission to remove. Add-ons already have their own tabs, so the commitment population must now match the complete quoted Family population.

## New cart hierarchy requirement
For each Family/Tier system, customer cart presentation must be deterministic and hierarchical:
1. **Main plan**
2. **Upgrades**, when present
3. **Add-ons**

If no Upgrade exists, add-ons follow the main plan immediately. If an Upgrade is later added, it takes the second position and existing add-ons move below it. If Upgrade is removed, add-ons move back up immediately.

Current source evidence: `QuoteSummary.tsx` renders raw `items.map(...)`, so visible order currently depends on insertion history. Fix presentation order from stable item role/Family identity, not by mutating canonical cart storage or rewriting quote identity.

Requirements:
- Keep main plan first for its Family/Tier system.
- Upgrade second only when present.
- Add-ons follow, preserving their own existing relative order.
- Ordering must update dynamically on add/remove without duplicating or recreating items.
- Do not change cart authority, removal semantics, pricing, IDs, snapshots or submission payload values.
- Reuse one ordering helper/derived view where the same hierarchy is needed; do not hand-sort separately in multiple customer surfaces.
- Customer Review/PDF/email may consume the same hierarchy when safe, so the commercial story remains consistent end-to-end.

## Required regressions
- main + add-on => main, add-on.
- main + Upgrade + add-on => main, Upgrade, add-on.
- adding Upgrade to main+add-on moves only presentation order; identities/snapshots unchanged.
- removing Upgrade restores main, add-on.
- multiple add-ons preserve relative order.
- Total Commitment contains primary + Upgrade + add-ons exactly once with correct combined Contract Value / Initial Payment.
- Email fixture visibly separates primary + Upgrade + add-on sections.
- Existing decimal precision, filter reset, cart readiness/removal/hydration, PDF naming and footer containment stay green.

## Next Claude action
Implement these corrections on the review branch, report root cause, changed files, focused tests/contracts and exact review SHA, then set **AWAITING CHATGPT REVIEW**. Do not push product source until reviewed.