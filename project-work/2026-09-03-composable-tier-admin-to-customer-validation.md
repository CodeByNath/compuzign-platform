# Upgrade journey — active correction track

## Status
- **AWAITING LIVE VALIDATION — source path audited; delivery failure now requires production runtime evidence**
- Auditor verdict: **Stop — production regression unresolved at runtime boundary**
- Deployed source remains `main@93ac03ec08a9f96b883fc4dd9deb8f8686cc129e`, deploy run `33945492532` successful/live.
- `d3eb4dc0abfa69e5286f1ca05df3824447c6f92e` remains local/unpushed and is **not part of this delivery regression**.

## Independent audit
Claude's report is consistent with production source.

`RequestsController::submitRequest()` validates/persists the durable Request before email, then only the creating call sends notifications. Matching retries return success without re-sending. The customer recipient comes from validated `$payload['email']`; customer and admin sends have independent `try/catch` blocks.

Current production customer send path is:
- subject derived from request type + quote ref;
- HTML from `NotificationTemplates::buildCustomerHtmlEmail(...)`;
- `wp_mail($email, $customerSubject, ..., ['Content-Type: text/html; charset=UTF-8'])`;
- `wp_mail() === false` logs `[CompuZign] Customer Request notification dispatch returned false for {ref}`;
- thrown template/application errors log `[CompuZign] Customer Request notification failed for {ref}: {message}`.

The deployed `93ac03ec` email-template change is only Family-item divider placement. Claude reproduced Main + Upgrade + Add-on customer HTML generation without an exception. No source evidence currently connects that divider change to non-delivery.

## Runtime gate — no source changes until this is checked
For one confirmed missing customer email, inspect production using the Request's **original creation/submitted time**, not a later retry time, because retries intentionally do not send again.

Required evidence:
1. Request/quote reference, stored customer email, and original submitted timestamp.
2. PHP/error log around that exact time for either existing customer-notification message above.
3. Production mail health / transport state (`health.mail` / whether `CZ_SMTP_HOST` is configured).
4. If `wp_mail()` returned true and no plugin error exists, inspect SMTP/provider/delivery/spam logs: application acceptance is not inbox delivery.

Interpretation:
- `notification failed ...: <message>` => template/application exception; return to Claude with exact error.
- `dispatch returned false` => mail transport failure; diagnose configured transport/PHPMailer evidence.
- no plugin error + SMTP configured => likely accepted downstream; inspect provider/inbox delivery evidence.
- no plugin error + no SMTP override => Hostinger/default WordPress transport is the active boundary; inspect host mail delivery evidence before touching plugin source.

## Separate follow-up
`d3eb4dc0` correctly restores the admin/customer labeling split and adds customer-template regression coverage, but it does not address delivery. Keep it separate until this production incident is resolved.

## Acceptance
Do not close this work until a real customer email is successfully received again and the existing Main → Upgrade → Add-on customer presentation remains correct.