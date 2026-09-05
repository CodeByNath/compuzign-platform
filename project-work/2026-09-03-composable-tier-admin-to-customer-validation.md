# Upgrade journey — active correction track

## Status
- **READY FOR CLAUDE — live gate failed: customer email delivery stopped after `93ac03ec`**
- Auditor verdict: **Stop — production regression**
- Deployed source: `main@93ac03ec08a9f96b883fc4dd9deb8f8686cc129e`
- Deploy run `33945492532` completed successfully and is live.

## Live regression
Nath reports that customer email delivery has stopped after this deployment. Treat this as a production regression in the current round, not as a cosmetic email-rendering issue.

The only PHP source changed by `93ac03ec` is `src/Modules/Requests/Notifications/NotificationTemplates.php`, where the Family-item email boundary logic moved `border-bottom` from the header cells to the trailing inclusion wrapper when inclusions exist. PHP lint passed before push, but lint does not prove runtime mail generation/delivery.

Do **not** assume the divider change itself is the cause. Trace the actual request-notification path end to end and produce evidence.

## Required Claude investigation / correction
1. Compare `NotificationTemplates.php` at `2b3ec74d` vs `93ac03ec` and isolate every runtime-affecting change in the customer/admin email path.
2. Trace request submission -> notification builder -> customer recipient resolution -> HTML generation -> `wp_mail`/mailer call and its return/error handling.
3. Reproduce the exact current KAIROS quote payload containing Main + Upgrade + Add-on through the notification builder locally without mutating production data.
4. Capture any PHP warning/fatal/exception/type error and identify the exact failing function/line. If no exception occurs, prove whether the mail call is reached and what result/error it returns.
5. Fix the smallest verified cause only. Preserve:
   - Main -> Upgrade -> Add-on commercial presentation;
   - Upgrade customer label;
   - item separation intent;
   - submitted quote snapshots, prices, quantities, IDs and recipient semantics.
6. Do not rewrite SMTP/WordPress mail configuration, notification architecture, quote schema or request persistence unless evidence proves that layer is actually broken.
7. Add a regression that executes the customer email generation path using a representative Main + Upgrade + Add-on submitted quote and fails on runtime exceptions/invalid output. If the mail sender has injectable/testable transport, also assert the send path is invoked once with the intended customer recipient.
8. Run PHP lint plus the relevant request/email contracts/regressions.

## Acceptance
- Customer notification generation completes without runtime error.
- Customer mail send path is reached successfully for the representative quote.
- Existing admin/customer recipients are unchanged.
- Main, Upgrade and Add-on remain visibly separated in generated HTML.
- No quote/cart/pricing/identity behavior changes.

Report exact root cause, failing line/path, changed files, tests, review SHA and whether live mail delivery still needs auditor validation. Set **AWAITING CHATGPT REVIEW** when ready. Do not push source to `main` until reviewed.