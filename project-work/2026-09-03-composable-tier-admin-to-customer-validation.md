# Upgrade journey — active correction track

## Status
- **AWAITING CLAUDE RESPONSE — customer email delivery failure remains unresolved**
- Auditor verdict: **Stop — production regression unresolved**
- Deployed source remains `main@93ac03ec08a9f96b883fc4dd9deb8f8686cc129e`, deploy run `33945492532` successful/live.
- Review head `d3eb4dc0abfa69e5286f1ca05df3824447c6f92e` is **NOT approved for push**.

## Auditor review of `d3eb4dc0`
Independent compare confirms it is exactly one commit ahead of production and changes only:
- `NotificationTemplates.php`
- `tests/notification-templates-composable-quote-parity.php`

The source change itself is narrow and internally reasonable: it restores the admin/customer label split by gating the customer-facing `Upgrades` relabel with the existing `$includeInternalIds` discriminator. The added test exercises customer HTML generation for Main + Upgrade + Add-on.

However, this commit **does not fix or explain the reported production failure that customer email delivery stopped**. Claude's own reproduction says `buildCustomerHtmlEmail()` succeeds and `wp_mail()` is reached. Therefore `d3eb4dc0` is an unrelated labeling correction discovered during investigation, not a delivery fix. Do not deploy it under this regression round while delivery is still broken.

## Required next Claude response
Do not make another speculative source change. Report, from current production source only:
1. The exact existing `RequestsController` customer-mail call site, including recipient source, subject, headers, `wp_mail()` call, return handling, catch block and log text.
2. Every production-observable failure signal already emitted by that path (exact `error_log` messages / hooks / return-false handling) and what evidence from one failed submission would distinguish:
   - template exception,
   - invalid/missing customer recipient,
   - `wp_mail() === false`,
   - mail transport accepted but downstream delivery/spam failure.
3. Whether the request record itself stores enough submission timestamp/reference/customer email to correlate a failed send without modifying source.
4. Whether WordPress/PHPMailer exposes an existing failure hook already wired in this plugin or WordPress core that can be inspected without changing product behavior.
5. Keep `d3eb4dc0` local as a separate follow-up candidate; do not mix it into the delivery correction.

## Runtime evidence needed before source changes
The fastest valid next step is production evidence from one failed submission: request/reference + approximate submission time and the corresponding existing PHP/mail log entry (or proof no failure entry exists). Until that evidence exists, do not rewrite SMTP, notification templates, request persistence, quote payloads or mail transport.

## Acceptance for this regression
- Root cause of delivery failure is identified from production evidence.
- Smallest verified correction only.
- Customer and admin recipients unchanged unless evidence proves recipient resolution is wrong.
- Main → Upgrade → Add-on presentation preserved.
- Customer email send succeeds in production after deployment.

Set **AWAITING CHATGPT REVIEW** only when the delivery root cause is actually identified and the proposed correction directly addresses it.