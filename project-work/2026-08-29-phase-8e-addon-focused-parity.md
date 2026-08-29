# Phase 8G — Bundle Inclusion Parity

## Status
- Phase 8E / 8F: `CLOSED`
- Production baseline: `main@5b97287032a4bb00e2d8849fde4ed30f42917eab`
- Phase 8G: `AWAITING CLAUDE RESPONSE`
- Source push: `SOURCE PUSH NOT APPROVED`
- Verdict: `Proceed with safeguards`
- Reviewed candidate: `phase-8g-bundle-inclusion-parity@4659e5a05dc2812f7743afac2a191c6dbafbde51`

## Requirement
OMNIA Basic’s **Foundation Bundle** children must appear in Plan Details, cart View details, Review & Finalise Quote, expanded proposal, and Print/Save-as-PDF. The bundle remains one priced commercial row at $4,000/month; children are display-only and never affect totals.

## Independent Review — 2026-08-29
GitHub confirms the candidate is exactly 1 commit ahead / 0 behind production, with merge base `5b972870...`. The inspected diff is confined to the declared TypeScript/CSS/dist/contract/package files.

Accepted:
- Plan Details consumes existing `CommercialLegPricedItem.includes`.
- Child rows are display-only; table total still reduces top-level `items` only.
- `FamilyTierQuoteItem.inclusionItems?: ServiceInclusion[]` snapshots the already-resolved `effective.inclusionItems` at selection.
- Review/proposal read the snapshot, never live catalog data, and retain `features` fallback.
- Family primaries and add-ons share the behavior.
- Pricing, Contract Value, Initial Payment, Leg occurrences, identity, routing/mutation, submission, persistence, admin, and legacy paths are unchanged.
- Reported type-check/build and focused contracts are appropriate; the three established unrelated baseline failures remain unchanged.

## Required Correction
Both new `FamilyInclusionsList` implementations key a child row as:

`child.id || \`${inclusion.id}-${ci}\``

When the same child inclusion is supplied by two different bundle parents, `child.id` repeats among siblings in the same `<ul>`. Duplicate keyed children can reconcile incorrectly after cart changes, producing stale, moved, or missing bundle rows.

### Claude — Correct Only This
1. In `OrderSummary.tsx` and `QuoteProposalPreview.tsx`, make every child key parent-scoped unconditionally, e.g.:
   `\`${inclusion.id || i}:child:${child.id || ci}\``
2. Extend `package-builder-bundle-inclusion-parity-contract.ts` with two bundle parents sharing the same child ID and prove generated/render keys remain unique. A source-pattern assertion alone is insufficient; include a small runtime uniqueness proof.
3. Do not change presentation, data shape, CSS, arithmetic, or any other behavior.
4. Run type-check, build, the Phase 8G contract, request-flow Family parity, and relevant Package Builder regression/isolation contracts.
5. Commit the correction on the same review branch, push that branch only, and record the new full SHA plus `4659e5a0...<new SHA>` diff. Do not push or merge to `main`.

After this correction, return status to `AWAITING CHATGPT REVIEW`. Browser validation remains deferred until the corrected commit is accepted, pushed to production, and deployed.
