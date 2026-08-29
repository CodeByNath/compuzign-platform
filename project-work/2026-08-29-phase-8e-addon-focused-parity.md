# Phase 8G — Bundle Inclusion Parity

## Status
- Phase 8E / 8F: `CLOSED`
- Production baseline: `main@5b97287032a4bb00e2d8849fde4ed30f42917eab`
- Phase 8G: `AWAITING CHATGPT REVIEW`
- Source push: `SOURCE PUSH NOT APPROVED`
- Verdict: `Proceed with safeguards` — key-scoping correction applied
- Reviewed candidate (superseded): `phase-8g-bundle-inclusion-parity@4659e5a0`
- Corrected candidate: `phase-8g-bundle-inclusion-parity@41c31b41ba51d594f1a4896c2a9ab7175b3f02cc` (pushed), still based on `main@5b97287032a4bb00e2d8849fde4ed30f42917eab`

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

## Claude Correction Report — 2026-08-29

Same branch `phase-8g-bundle-inclusion-parity`, new commit `41c31b41` on top of `4659e5a0` (pushed, branch only — `main` untouched).

**Fix applied (`OrderSummary.tsx` and `QuoteProposalPreview.tsx`):** child row key changed from `child.id || \`${inclusion.id}-${ci}\`` (fell back to the bare, unscoped `child.id` whenever one existed) to unconditionally parent-scoped: `` `${inclusion.id || i}:child:${child.id || ci}` ``. Two Bundle parents supplying a child with the same `child.id` now always produce distinct keys.

**Contract extended** (`package-builder-bundle-inclusion-parity-contract.ts`): added a source-pattern check rejecting the old bare-fallback shape (`key={child.id ||`) and requiring the new parent-scoped pattern in both files, plus a runtime proof — two `ServiceInclusion` bundle parents (`bundle_a`, `bundle_b`) each supplying a child with the identical id `shared_child`, run through the real key expression, asserting the resulting key set has no duplicates and both parent-scoped keys (`bundle_a:child:shared_child`, `bundle_b:child:shared_child`) are present.

Nothing else changed — no presentation, data shape, CSS, or arithmetic touched.

**Full 40-char SHA:** `41c31b41ba51d594f1a4896c2a9ab7175b3f02cc` (pushed to `origin/phase-8g-bundle-inclusion-parity`, confirmed via `git ls-remote`; `git diff --stat 4659e5a0...41c31b41` below)
```
 dist/js/cost-builder.js                                        | 2 +-
 resources/ts/components/request-flow/OrderSummary.tsx           | 2 +-
 resources/ts/components/request-flow/QuoteProposalPreview.tsx   | 2 +-
 scripts/package-builder-bundle-inclusion-parity-contract.ts     | 22 +++++++++++
 4 files changed, 25 insertions(+), 3 deletions(-)
```
(paths relative to `wp-content/plugins/compuzign-platform/`)

**Tests:** `tsc --noEmit` clean, `npm run build` clean. Ran the Phase 8G contract, `request-flow-family-tier-parity`, `package-family-request-flow`, `package-builder-regression-lock`, `cost-builder-isolation` individually (all pass) plus a full sweep of every registered contract: only the three confirmed pre-existing failures remain (`admin-station-css`, `package-builder-flow`, `platform-identity-schema`).

Awaiting review of the actual `41c31b41` diff before any push to `main`.
