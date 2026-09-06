# Quote PDF + Cart Presentation Correction

## Status
- **CLOSED**
- Auditor verdict: **Proceed**.
- Production: `main@573dc72b...`.
- Deploy: GitHub Actions `34017800719` succeeded for `ca803bb3`; `34018632799` succeeded for follow-up `573dc72b`.
- Review branch cleanup complete.

## Accepted source change
1. PDF/payment-cycle facts and totals no longer inherit the inclusion ✓ marker. ✓ remains strictly for actual inclusion rows.
2. Cart additional Commercial Leg inclusion labels are indented beneath their section heading while Qty / Unit price / Line total columns remain aligned in both the disclosure panel and finalise-quote sidebar.
3. No pricing, Commercial Leg, resolver, quote ordering, persistence, Request/PDF data-shape, or Upgrade Your Build / Build Your Own behaviour changed.

## Closure
The user has now completed/accepted the live UI corrections and explicitly directed that the cart / PDF / email customer-output work be treated as complete and closed before beginning the next Admin Build Your Own UX phase.

Do not reopen this completed work without new hard evidence of a defect. Further Build Your Own / Tier Catalogue Admin UX work belongs in its own work file.