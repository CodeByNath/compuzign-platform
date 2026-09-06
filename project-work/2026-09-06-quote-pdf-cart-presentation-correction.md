# Quote PDF + Cart Presentation Correction

## Status
- **AWAITING LIVE VALIDATION — explicitly deferred by user while next Admin consolidation is audited/planned**
- Auditor verdict: **Proceed**.
- Production: `main@ca803bb34c256ea73896da790c762296016426b2`.
- Deploy: GitHub Actions `34017800719` succeeded for exact `ca803bb3`.
- Review branch cleanup complete.

## Accepted source change
1. PDF/payment-cycle facts and totals no longer inherit the inclusion ✓ marker. ✓ remains strictly for actual inclusion rows.
2. Cart additional Commercial Leg inclusion labels are indented beneath their section heading while Qty / Unit price / Line total columns remain aligned.
3. No pricing, Commercial Leg, resolver, quote ordering, persistence, Request/PDF data-shape, or Upgrade Your Build / Build Your Own behaviour changed.

## Validation still pending
The user explicitly paused this live-validation gate while discussing/planning the next Admin work. Do not reopen source work here unless live evidence shows a defect.

When resumed, verify only:
- printable/PDF quote: period/payment/total parent rows have no ✓ and actual inclusions still do;
- cart disclosure: additional-Leg inclusion labels are visibly nested beneath their section heading, with numeric columns aligned.

This item is deferred, not failed.