# Phase 8G — Bundle Inclusion Parity

## Status
- Phase 8E / 8F: `CLOSED`
- Production baseline: `main@5b97287032a4bb00e2d8849fde4ed30f42917eab`
- Phase 8G: `AWAITING CLAUDE RESPONSE`
- Source push: `SOURCE PUSH NOT APPROVED`
- Audit verdict: pending actual-diff review
- Reported local candidate: `phase-8g-bundle-inclusion-parity@4659e5a0`

## Requirement
OMNIA Basic’s **Foundation Bundle** children must appear in Plan Details, cart View details, Review & Finalise Quote, expanded proposal, and Print/Save-as-PDF. The bundle remains one priced commercial row at $4,000/month; children are display-only and never affect totals.

## Accepted Architecture Boundary
- `CommercialLegPricedItem.includes` already supplies Plan Details children.
- Snapshot the selected variant’s existing `effective.inclusionItems` onto `FamilyTierQuoteItem` as optional structured data; keep `features` for compatibility.
- Request-flow/PDF must read the selection-time snapshot, never live catalog data.
- Old items without the new snapshot fall back to `features`.
- Apply the same presentation to Family primaries and add-ons.
- No Package/Rate Sheet resolver, identity, pricing, totals, mutation/routing, submission, persistence, admin, or legacy-item changes.
- The known request-persistence gap remains deferred.

## Claude Report
Claude reports local commit `4659e5a0`, based exactly on production. Reported changes:
- Plan Details renders `item.includes` as child rows while top-level-only arithmetic remains unchanged.
- `FamilyTierQuoteItem.inclusionItems?: ServiceInclusion[]` is populated from `effective.inclusionItems`.
- Review and proposal use structured bundle/child rendering with `features` fallback for primary/add-on rows.
- Focused CSS and a new `package-builder-bundle-inclusion-parity` contract were added; dist rebuilt.
- Type-check/build passed. Full contract sweep retained only the established unrelated failures: `admin-station-css`, `package-builder-flow`, and `platform-identity-schema`.

## ChatGPT Audit — Evidence Blocked
GitHub independently returned **“No commit found”** for `4659e5a0`. The candidate is not available on the authoritative remote, and no full diff was supplied. Under the auditor boundary, Claude’s report is not a substitute for inspecting the actual commit/diff. No source verdict or production push approval is possible yet.

## Claude — Next Action
1. Push the exact existing candidate commit to the non-production review branch `phase-8g-bundle-inclusion-parity` only. Do not amend/rebuild it first and do not push or merge to `main`.
2. Record the full 40-character SHA, remote branch name, `git diff --stat main...<SHA>`, and confirmation that it is based on `main@5b972870...`.
3. If a review-branch push is impossible, paste the complete `git diff --binary main...4659e5a0` into an accessible audit artifact and record its location here.
4. Leave status `AWAITING CHATGPT REVIEW` after supplying evidence.

No browser validation occurs until the actual source diff is accepted and deployed.
