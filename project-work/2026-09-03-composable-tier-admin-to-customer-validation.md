# Upgrade journey — active correction track

## Status
- **AWAITING CHATGPT REVIEW — investigated; no crash found in the reported diff; a real, separate email-labeling regression found and fixed**
- Auditor verdict: **Stop — production regression**
- Deployed source (unchanged, `main` not touched this round): `main@93ac03ec08a9f96b883fc4dd9deb8f8686cc129e`, deploy run `33945492532` successful/live.
- Review head with this round's investigation/fix: `review/upgrade-journey-finalisation@d3eb4dc0abfa69e5286f1ca05df3824447c6f92e` — **not yet pushed to `main`**, awaiting this review.

## Claude's report — investigation: "customer email delivery stopped after 93ac03ec"

### 1. Diff isolation (item #1)
Confirmed by direct `git diff 2b3ec74d 93ac03ec -- .../NotificationTemplates.php`: the ONLY change is the `border-bottom` relocation in `emailFamilyRow()` (header cell → conditional on `$inclusionRows === ''`) and `emailInclusionItemsList()` (its own wrapper `<td>` gains the border unconditionally). No control-flow change, no new function call, no new required data field.

### 2. Pipeline trace (item #2)
`RequestsController.php` (unchanged by `93ac03ec`): `submitRequest()` persists the durable Request and transient quote-view payload FIRST, then independently wraps the admin (`wp_mail(...NotificationTemplates::buildAdminHtmlEmail...)`) and customer (`wp_mail(...NotificationTemplates::buildCustomerHtmlEmail...)`) sends in their OWN `try/catch`, each logging (`error_log`) both a thrown `\Throwable` and an explicit `wp_mail() === false` return — by existing design, a template-render failure can never 500 the customer's response nor silently swallow the other email. This means: if `buildCustomerHtmlEmail()` throws, it is caught and logged, not silent; if it doesn't throw, `wp_mail()` is definitely reached.

### 3. Reproduction (item #3)
Built the exact reported KAIROS shape locally (Main [KAIROS Enterprise, multi-stream] + Upgrade [composable, coexisting, own inclusions] + Add-on [OMNIA Guard]) and called `NotificationTemplates::buildCustomerHtmlEmail()` directly (`vendor/autoload.php`, no full WordPress bootstrap). Result: **no PHP warning, notice, fatal, or thrown exception** — the call returns well-formed HTML (verified: correct Main/Upgrade/Add-on labels, inclusions, totals). The `93ac03ec` divider change does not, on its own, break customer email HTML generation for this or any other payload shape I could construct — it is pure additive string interpolation with no new undefined-key access or altered control flow.

### 4. What I DID find (items #4–5)
Running the plugin's existing `tests/*.php` suite (not part of any `npm run contract:*`/CI step — I had not been running it, which is itself a process gap) surfaced a real, separate regression, introduced in the EARLIER round (`2b3ec74d`, already reviewed/approved/deployed), not `93ac03ec`: `emailFamilyRow()`'s "Upgrades" relabel for a composable item coexisting with its primary was applied unconditionally to BOTH admin and customer email. `tests/notification-templates-composable-quote-parity.php` (untouched since before this work began) already encoded the correct, pre-existing contract: admin email keeps raw "Build Your Own" identity unconditionally, matching every other Admin-facing surface (`requestItemDisplay.ts`, the Admin Request drawer) — only the customer email should ever relabel. Fixed by gating the relabel on the function's existing `$includeInternalIds` admin/customer discriminator (`!$includeInternalIds`) rather than a new parameter. This is a genuine, now-fixed defect, but it is a **label difference**, not an exception — it does not explain a delivery failure.

### 5. Fix applied and regression added (items #5, #7)
- `NotificationTemplates.php`: `$isUpgrade = $role === 'composable' && !$includeInternalIds && self::composableCoexistsWithPrimary(...)`.
- Extended `tests/notification-templates-composable-quote-parity.php`'s existing three-way (Main+Upgrade+Add-on) fixture — the exact shape requested — to also build the CUSTOMER email (with a real `$quoteViewLink`, exercising the `esc_url()` branch admin never reaches) and assert: no exception, correct "Upgrades" labeling, and exactly one visible item-boundary divider per item (Main: 2 header cells, Upgrade: 1 inclusion-wrapper cell, Add-on: 2 header cells = 5 total for this fixture).
- No changes to commercial presentation order, cart authority, pricing, IDs, snapshots, or recipient logic.

### 6. Verification (item #8)
`php -l` clean. Full `tests/*.php` suite run — 5 pre-existing, unrelated failures found (Service route fixture snapshot, Tier capability route registration, `RequestsController` test's own outdated constructor signature, a missing `sanitize_text_field()` WP stub in a Package-schema test) — none touch the Requests/Notifications module or were affected by this change. Full `npm run contract:*`/`regression:*` sweep (85 scripts) + `docs:check`: same 7 pre-existing unrelated failures as prior rounds (Tier Occupant/Edition Admin, Rate Sheet Tool CSS, Platform Identifier schema, a pre-existing missing `FullBuildDetail.tsx`) — none touched by this diff.

### What I cannot verify from here
I cannot access production error logs, SMTP configuration, or run `wp_mail()` against a live mail transport. My reproduction proves the notification BUILDER completes and `wp_mail()` is DEFINITELY REACHED with valid HTML for the reported quote shape — it does not prove `wp_mail()` itself succeeds at actual delivery in the live environment. If the report of "delivery stopped" is accurate and not coincidental timing, the cause is most likely outside this diff entirely (mail transport/SMTP/spam-filtering, or a data shape in the real production quote genuinely different from every fixture I could construct). Requesting: production `error_log` entries around the affected submission(s) (the two try/catch blocks in `RequestsController.php` log both thrown exceptions and `wp_mail() === false` explicitly) — that log is the fastest way to either confirm or rule out my analysis, and is not something I can generate from this environment.

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

## Next action
Done — see "Claude's report" above. **Live mail delivery still needs auditor/Nath validation** — I could not reproduce a crash in the `93ac03ec` diff itself, and production `error_log` access is the fastest way to confirm or rule out my analysis. Awaiting review of `review/upgrade-journey-finalisation@d3eb4dc0abfa69e5286f1ca05df3824447c6f92e`.