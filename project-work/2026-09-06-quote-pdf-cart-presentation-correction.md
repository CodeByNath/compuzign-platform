# Quote PDF + Cart Presentation Correction

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict: **Proceed**.
- Production: `main@573dc72b...` (follow-up fix, see below), superseding `main@ca803bb3...`.
- Deploy: GitHub Actions `34017800719` succeeded for `ca803bb3`; GitHub Actions `34018632799` succeeded for the follow-up `573dc72b`.
- Review branch cleanup complete for both.

## Reopened per the doc's own exception (2026-09-06)
While this item sat deferred, the user supplied a live screenshot of the finalise-quote sidebar (an additional Commercial Leg group — "Extensions billed Annually $80/yr" — followed by its own inclusion row) showing NO visible indentation, directly contradicting the accepted `ca803bb3` fix. Per this doc's own instruction ("do not reopen source work here unless live evidence shows a defect"), this qualified and was reopened immediately, no separate approval requested.

**Root cause**: `ca803bb3`'s fix only touched `InclusionDisclosurePanel` (the cart quick-view's own `<table>`), per the original ticket's "authoritative source already traced" list. That list never named `resources/ts/components/request-flow/OrderSummary.tsx` — the ALWAYS-VISIBLE finalise-quote sidebar, which independently re-implements the same "additional Commercial Leg group + Bundle child" row rendering using its own `cz-os__feature` checklist classes. It carried the identical section-vs-child conflation bug (`row.sectionKey !== undefined ? 'cz-os__feature--child' : ''`) that `ca803bb3` fixed in the panel, PLUS a bare, low-specificity indent selector — so it was never actually fixed, matching exactly what the screenshot showed.

**Fix** (`573dc72b`): `OrderSummary.tsx` now derives `--section` from `row.sectionKey` and `--child` from `row.isChild` independently, mirroring `InclusionDisclosurePanel`'s own split. `cost-builder.css` adds `.cz-os__feature--section` and a compound `--section.--child` rule with a strictly greater indent, and scopes both (plus the pre-existing `--child` rule) under `.cz-os__features` rather than as a bare single class, hardening them against a generic theme-level list-item padding reset. The focused contract (`contract:quote-pdf-cart-presentation-correction`) was extended to cover this file's own class derivation and the CSS specificity/stacking. No change to `cartBreakdown`/`commercialBreakdown` derivation, Commercial Leg identity, pricing, quote ordering, or the customer Upgrade Your Build/Build Your Own flow.

Pushed directly by the user at their own explicit request ("commit i'll push") — one clean commit (`573dc72b`) on top of `main@ca803bb3`, `tsc`/build/docs:check/full contract suite all passing before push. GitHub Actions confirmed deployed successfully afterward. Review branch (`review/quote-pdf-cart-presentation-correction-followup`) deleted from origin; stale local branches from this and the prior Tier Catalogue phase also cleaned up.

## Accepted source change (both commits combined)
1. PDF/payment-cycle facts and totals no longer inherit the inclusion ✓ marker. ✓ remains strictly for actual inclusion rows.
2. Cart additional Commercial Leg inclusion labels are indented beneath their section heading while Qty / Unit price / Line total columns remain aligned — now correct in BOTH the cart disclosure panel (`ca803bb3`) and the finalise-quote sidebar (`573dc72b`).
3. No pricing, Commercial Leg, resolver, quote ordering, persistence, Request/PDF data-shape, or Upgrade Your Build / Build Your Own behaviour changed.

## Validation needed
Verify on live:
- printable/PDF quote: period/payment/total parent rows have no ✓ and actual inclusions still do;
- cart disclosure (the ✓/×-toggle quick view): additional-Leg inclusion labels are visibly nested beneath their section heading, with numeric columns aligned;
- **finalise-quote sidebar** (the always-visible summary during checkout, the surface the reopening screenshot showed): additional-Leg inclusion labels are now ALSO visibly indented beneath their section heading.