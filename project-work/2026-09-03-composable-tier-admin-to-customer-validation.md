# Upgrade journey — active correction track

## Status
- **AWAITING CHATGPT REVIEW — Claude answered the 5 recorded review items; no source change proposed; runtime evidence requested from Nath**
- Auditor verdict: **Stop — production regression unresolved**
- Deployed source remains `main@93ac03ec08a9f96b883fc4dd9deb8f8686cc129e`, deploy run `33945492532` successful/live.
- Review head `d3eb4dc0abfa69e5286f1ca05df3824447c6f92e` stays local/unpushed, per instruction #5 — a separate, already-verified follow-up, not part of this regression.

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

## Claude's response — report only, no source change (per "AWAITING CLAUDE RESPONSE")

`d3eb4dc0` kept local as a separate follow-up candidate, per instruction #5. Nothing pushed. Everything below is read from current production source (`main@93ac03ec`, unaffected by `d3eb4dc0`) — no file was edited to produce this report.

### 1. Exact customer-mail call site — `RequestsController::submitRequest()`
Recipient source: `$email = $payload['email'];` — `$payload` is `RequestSchema::validate($request)['data']`, where `email` is set at `RequestSchema.php:29` via `sanitize_email(...)` and rejected at `:40` (`422 A valid email address is required.`) if empty or `!is_email($email)` — **the recipient is guaranteed non-empty and RFC-valid by the time this call site is reached; invalid/missing recipient cannot occur here.**

```php
$headers = ['Content-Type: text/html; charset=UTF-8'];
$customerSubject = $isAssessment
    ? "Your assessment request has been received — {$quoteRef}"
    : "Your quote request has been received — {$quoteRef}";
try {
    $customerMailSent = wp_mail(
        $email,
        $customerSubject,
        NotificationTemplates::buildCustomerHtmlEmail($payload, $siteTitle, $quoteViewLink),
        $headers
    );
    if ($customerMailSent === false) {
        error_log('[CompuZign] Customer Request notification dispatch returned false for ' . $quoteRef);
    }
} catch (\Throwable $e) {
    error_log('[CompuZign] Customer Request notification failed for ' . $quoteRef . ': ' . $e->getMessage());
}
```
The admin-mail block immediately above it is structurally identical and fully independent (own try/catch) — a customer-mail failure never touches the admin send or vice versa.

### 2. Distinguishing evidence per failure mode
| Failure mode | What's already emitted | How to tell them apart |
|---|---|---|
| Template exception in `buildCustomerHtmlEmail()` | `error_log('[CompuZign] Customer Request notification failed for {ref}: {message}')` | Log line contains a PHP exception message/class, not a generic string |
| Invalid/missing recipient | **Cannot occur** — `RequestSchema::validate()` rejects the whole submission (422) before any Request/email exists | No durable Request would exist for that attempt at all |
| `wp_mail()` returns `false` (PHPMailer-level failure, e.g. SMTP auth/connect error) | `error_log('[CompuZign] Customer Request notification dispatch returned false for {ref}')` | Log line, exact text above, no exception message attached |
| Transport accepted, downstream delivery/spam failure | **Nothing** — `wp_mail()` returning `true` only means PHPMailer/the transport accepted the message for sending, never that an inbox received it | No plugin-level signal exists for this at all; only the receiving mail server/inbox (or the SMTP provider's own delivery log, if `CZ_SMTP_HOST` is configured — see below) would show it |

**One additional structural nuance, not asked for directly but directly relevant to reading the evidence:** the email send only ever runs on the branch `created_by_this_call === true` (line ~116) — the FIRST call that creates the durable Request for a given `quote_ref`. Every subsequent call for the *same* `quote_ref` (a customer's own retry, a double-click, a slow network causing the browser to resend) returns `200 success` at line ~138 **without attempting to send either email again**, by design (to avoid rotating the emailed quote-view link). So: if that one original attempt's `wp_mail()` failed or threw, a customer who retried submission would keep seeing "success" on every retry and never receive an email from any of them — with only ONE log line ever written, timestamped at the *original* attempt, not the retry. This matters for correlating evidence: search logs by the Request's actual creation time, not by the time the customer says they last tried.

### 3. Correlating a failed send without a source change — yes, sufficient data exists
The durable `cz_request` post (`RequestMetaSchema.php`) stores:
- `cz_request_ref` — the `quote_ref` (indexed, exact-match queryable)
- `cz_request_data` — "Full payload: identical shape to transient schema + `promoted_at` timestamp" — includes the customer `email` and the original `submitted` (`current_time('mysql')`) timestamp
- `cz_platform_id` — the permanent CZR identity

Given one customer's report (approximate time + their email or the `quote_ref` from their "quote request has been received" confirmation, if they got one), the matching `cz_request` post's `cz_request_data.submitted` pins the exact second the mail attempt happened server-side — that timestamp is what should be matched against PHP/error logs, not the customer's own account of when they submitted (their retries, per #2 above, produce no new attempt or log line).

### 4. Existing failure-observability hooks — two found, neither wired for this yet
- **`phpmailer_init`** (WordPress/PHPMailer core hook) — already used, but only for SMTP *configuration*, not failure detection: `src/Core/MailService.php` hooks it to set `Host`/`Port`/`Auth`/`SMTPSecure` from `CZ_SMTP_HOST`/`CZ_SMTP_PORT`/`CZ_SMTP_USER`/`CZ_SMTP_PASS`/`CZ_SMTP_FROM` wp-config.php constants — **only when `CZ_SMTP_HOST` is defined at all**; otherwise `MailService::register()` returns early and WordPress falls back to whatever `mail()` transport the PHP/server environment provides.
- **`wp_mail_failed`** (WordPress core action, fires with a `WP_Error` whenever PHPMailer throws internally during `wp_mail()`) — **not hooked anywhere in this plugin.** This is the one gap: a PHPMailer-level failure (bad SMTP credentials, connection refused, host unreachable) that happens *inside* `wp_mail()` itself would currently produce no log entry beyond the generic `wp_mail() === false` line already in place — `$e->getMessage()` in the catch block only fires for a `\Throwable` thrown by our own code (e.g. `NotificationTemplates`), never for `wp_mail()`'s own internal PHPMailer errors, since `wp_mail()` catches those internally and returns `false` rather than propagating.
- **Immediately checkable without any code change**: `GET /wp-json/compuzign/v1/admin/overview` (admin-authenticated REST route, `AdminController::getOverview()`) returns `health.mail`, defined as `defined('CZ_SMTP_HOST')` (`MailService.php:9`). If that reads `false` on production, no SMTP override is active at all and WordPress/Hostinger's own default mail transport is being used — a very common, completely `93ac03ec`-unrelated cause of exactly this symptom (native `mail()` on shared/managed hosting is frequently rate-limited, unauthenticated, or spam-filtered outright, and produces no application-level error since `wp_mail()` still returns `true` for "handed off to the local MTA," never confirming acceptance or delivery).

### Summary / recommended next evidence step
No source-level defect explains "customer email delivery stopped" — items #1–4 above account for every failure surface this plugin currently exposes, and none of them were touched by `93ac03ec`. The fastest concrete next step, in order:
1. Hit `/wp-json/compuzign/v1/admin/overview` as an admin and check `health.mail` — settles in seconds whether SMTP override is even active.
2. Pull `error_log` entries for `[CompuZign] Customer Request notification` around one specific failed submission's actual server-side timestamp (from that Request's own `cz_request_data.submitted`, per #3 — not the customer's own recollection).
3. If `health.mail` is `true` and no error_log entry exists for a confirmed-missing email, the failure is downstream of `wp_mail()` returning `true` (inbox/spam-filter/provider-side) — outside anything this plugin's source can detect or fix.

`d3eb4dc0` remains a valid, separate, already-verified fix (admin/customer email-label parity) — proposed as a follow-up once this regression is closed, not as part of it.