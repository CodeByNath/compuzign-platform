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

The cart quick-view presentation is good: base inclusions once + **Extensions billed Annually**. The finalise-quote sidebar instead expands every Family item into the full period breakdown, duplicating detail already available in the PDF/email/View-Print output.

## Required range wording contract
Customer-facing range formatter must stop using `Plan start–...`.
- Only when a period/stream begins at the plan start (`from/start = 0`):
  - finite end: `Through Month 10`, `Through Year 2`, etc., using the existing unit/context already owned by that surface;
  - open-ended: **Until Cancelled**.
- Later ranges such as `Month 3–11` keep normal range grammar; never prepend `Through`.
- Do not output customer-facing `Ongoing` for these plan/term displays. Internal `null` remains the resolver/storage open-end representation.
- Apply through the shared customer range presentation used by Plan Details, quote/PDF, customer View/Print, email and other repeated customer surfaces; do not create per-surface copies.

## Contract Value — narrow correction only
Do **not** rename Contract Value / Total Contract Value and do **not** change TCV arithmetic.

Keep the existing behavior when the quote is fully finite:
- all contributing items/streams finite -> show the existing numeric **Total Contract Value** (e.g. `$208,000`).

Only the non-finite fallback wording changes:
- all contributing items/streams indefinite -> show **Until Cancelled** instead of `Ongoing`;
- mixed finite + indefinite -> show **Until Cancelled** instead of `Ongoing`.

So the existing `computeTotalContractValue()` null/non-null decision remains authoritative: non-null -> numeric value; null because any contributing stream is open-ended -> **Until Cancelled**. Initial Payment remains numeric and unchanged. This should be a minimal shared presentation change, not a new commitment model.

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
2. Specifically open-ended Upgrade/Add-on range: **Until Cancelled**.
3. Fully finite Contract Value remains numeric exactly as today.
4. Mixed or indefinite Contract Value shows **Until Cancelled**; Initial Payment remains numeric.
5. Finalise sidebar matches compact cart presentation; PDF/email/View-Print remain detailed and unchanged structurally.
6. Add focused contracts for range wording, finite vs non-finite Contract Value fallback, and print-preview independence from visible sidebar rendering.

Report changed files/tests/clean review SHA and set **AWAITING CHATGPT REVIEW**. Do not push to `main` before review.