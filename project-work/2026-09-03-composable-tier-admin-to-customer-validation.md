# Composable Tier — continuous work track

## Status
- **AWAITING LIVE VALIDATION — corrected live-correction round deployed.**
- Auditor verdict: **Proceed with safeguards.**
- Independently verified production `main@eb200731384359041ac585fcbc9ed57f01550f0d`.
- Independently verified Hostinger Deploy **#939 / run `33768478158`**, attempt 2, `head_sha=eb200731384359041ac585fcbc9ed57f01550f0d`, completed **success**. Attempt 1 failed at SSH deploy; retry succeeded.

## Accepted source behavior
- Customer cart/review uses **Upgrades** only when composable coexists with the same Family+Tier-System primary; standalone/Admin **Build Your Own** remains unchanged.
- Composable Quote Details renders the successful snapshot (`inclusionItems` + `legPaymentSummaries`), not fixed-slot/live re-resolution.
- Review & Finalise action area is sticky/reachable.
- Admin Request renders stored composable inclusion quantities and payment streams.
- Matching repeated Request submission is side-effect-idempotent: no new secret/transient/email; changed payload remains 409.
- Only the creator call mints quote-view secret/transient and dispatches notifications. `wp_mail() === false` and exceptions are logged separately.
- No pricing/resolver/Rate Sheet/entity/identity changes; legacy Requests remain compatible.

## Live browser validation — do now
Use deployed production surfaces read-only except for the explicit Request submission gate below.

### Customer configurator / cart
1. Open `/pricing/`, select the KAIROS normal plan used in the prior test, then add the composable Block Storage option.
2. Confirm the aggregate composable line says **Upgrades**, not Build Your Own, while the normal Tier remains selected.
3. Open composable **Quote details**. Confirm it no longer says “Details unavailable”; it must show selected inclusion + quantity and stored payment stream. With unchanged KAIROS setup expect Block Storage ×100, Monthly $10, Ongoing.
4. Open Review & Finalise at approximately 1067×701 and a smaller supported height. Confirm **Print / Save as PDF** remains visibly reachable without scrolling past the whole right rail.

### Existing durable Request
Open existing Request **CZ-B9W42O / CZRWNTCQ** in Admin. Confirm:
- three roles remain separate: primary, Add-on, composable;
- the composable aggregate line has stored inclusion name/quantity and stored Leg/payment stream beneath it;
- no raw customer-facing Platform IDs are introduced.
Existing Request cannot prove the newly corrected external email dispatch because it predates this deploy; do not mutate/rewrite it.

### Fresh Request/email gate
A fresh production Request is required to prove actual external email delivery, new public quote, proposal/print/PDF, totals, and exact-once behavior. **Do not submit it unless Nath explicitly authorizes that production Request + email mutation.** Once authorized, use the same three-line KAIROS shape (normal primary + Add-on + composable Block Storage ×100), then validate:
- one durable Request only;
- Admin detail correct;
- proposal/print/PDF and public quote show exactly one composable aggregate with stored quantity/payment stream;
- primary + composable do not collapse;
- totals include composable exactly once;
- no raw Platform IDs customer-facing;
- customer email actually arrives and carries the same stored snapshot values;
- do not intentionally resubmit the same live Request merely to test idempotency; source/controller contracts already cover retry semantics.

Record PASS/FAIL evidence here after browser validation. Do not begin final UI/UX refinement until this representation chain is accepted.