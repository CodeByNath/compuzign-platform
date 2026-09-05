# Upgrade journey — active correction track

## Status
- **READY FOR CLAUDE — live validation found customer wording/presentation defects**
- Auditor verdict: **Proceed with safeguards**
- Production: `main@6a03a18239cec8fa32ce13c5a3bf626293d6f0bd`; deploy run `33973451326` / #954 successful.
- Source architecture/snapshot work remains accepted. This round is customer presentation only.

## Live evidence
Fresh quote/PDF `CZ-FP7VKT` shows rejected wording:
- `PLAN START–MONTH 10`
- `PLAN START–ONGOING`
- `Contract Value Ongoing`
while the established Plan Summary already uses **Until Canceled**.

The cart quick-view presentation is good: base inclusions once + **Extensions billed Annually**. The finalise-quote sidebar instead expands every Family item into the full period breakdown, duplicating detail already available in the PDF/email/View-Print output.

## Required wording contract
Customer-facing range formatter must stop using `Plan start–...`.
- Only when a period/stream begins at the plan start (`from/start = 0`), replace the start-range grammar with **Through**:
  - finite end: `Through Month 10`, `Through Year 2`, etc., using the existing unit/context available to that surface;
  - open-ended: use the established **Until Canceled** wording. Do not output `Ongoing` anywhere customer-facing.
- For later ranges such as `Month 3–11`, keep normal range grammar; never prepend `Through`.
- Contract Value with any genuinely open-ended contributing charge must display **Until Canceled**, not `Ongoing`.
- Apply consistently to Plan Details, quote/PDF, customer View/Print, email, cart/finalise quote and any shared customer range/value helper. Do not change resolver/storage semantics (`null` remains the internal open end).

## Finalise-quote sidebar correction
`OrderSummary.tsx` currently renders `FamilyInclusionsList()` with `periodBreakdownRowsForFamilyTierItem()`, causing the screenshot-4 full period dump. This visible sidebar may safely use the same compact Family disclosure semantics as the cart because `QuoteProposalPreview` is separately kept in the DOM specifically for print cloning (`.cz-proposal`) regardless of expand state. Therefore:
- visible finalise-quote Family items should use the compact cart shape: base inclusions once + Extension groups;
- do **not** remove or weaken `QuoteProposalPreview`, PDF/email/View-Print detailed period rendering, or stored `commercialBreakdown`;
- printing/PDF/email must continue using the detailed View Details-derived model.

## Preserve
- pricing/TCV authority and numeric values;
- quote-time snapshots and customer-safe ID boundary;
- Main → Upgrade → Add-on ordering;
- Bundle child total rules;
- mail transport/idempotency;
- legacy quote fallbacks.

## Acceptance
1. Starter Cloud detailed output: `Through Month 10`; Month 11–23 unchanged continuation + annual detail; no `Ongoing`.
2. Open-ended Upgrade/Add-on: **Until Canceled** (not `Plan start–Ongoing`).
3. Contract Value: **Until Canceled**.
4. Finalise sidebar matches compact cart presentation; PDF/email/View-Print remain detailed and unchanged structurally.
5. Add focused contracts for wording and for print-preview independence from visible sidebar rendering.

Report changed files/tests/clean review SHA and set **AWAITING CHATGPT REVIEW**. Do not push to `main` before review.