# Admin Station branded login gate

## Status
- **READY FOR CLAUDE — Phase 1 correction required before source push.**
- Production base remains `main@57dc0fbfe4aa7c0b93568dba925b9c29dcf4ff49`.
- Reviewed head: `review/admin-station-login-gate@d3806fa0`, exactly 1 commit ahead / 0 behind production.
- Source push: **NOT APPROVED**.
- Auditor verdict: **Proceed with safeguards**.

## Goal
Admin Station URL → branded CompuZign login → WordPress auth/session underneath → `manage_compuzign` check → existing Admin Station. No visible WordPress login/dashboard journey for a platform tester; no Command Centre resurrection.

## Accepted from `d3806fa0`
- Current `PlatformAccess` remains capability/account authority; no credential/provisioning change.
- Logged-out Admin Station gets branded login; unauthorized logged-in user gets product-styled denied state.
- `wp_signon()` runs before output; nonce + generic auth failure are present.
- Current Admin Station field/button/token system is reused; no retired Command Centre assets/routes/components.
- No Station Manager, CRM, pricing, identity, persistence, quote/customer behavior change.
- Diff is scoped to Admin Station auth/module/templates/styles, plugin registration, focused test, code map, generated CSS.

## Required correction before approval
The handler is currently registered globally on `template_redirect`, and it trusts a client-supplied hidden redirect field until `wp_safe_redirect()`. That is broader than the intended Admin-Station-only login boundary. Also, `wp_safe_redirect()` may fall back to the WordPress admin fallback when a submitted target is invalid, contrary to the requirement that this flow never expose the WP admin journey.

Claude must make the login POST boundary explicitly **Admin Station page only** and remove client authority over the return destination:
1. Process login only when the current queried page is the page hosting `[compuzign_admin_station]` (or an equally source-grounded Admin Station page predicate). A matching nonce posted to any unrelated frontend page must be ignored.
2. Do not trust a hidden/user-supplied redirect URL. Prefer removing `REDIRECT_FIELD` entirely. Since the form POSTs to itself, derive the return URL server-side from the current Admin Station request/page, strip `login_error`, and redirect only there.
3. If a redirect validation helper is retained, its explicit fallback must be the current Admin Station page/site-safe URL — **never WordPress `admin_url()`**.
4. Preserve generic invalid-credential feedback, nonce verification, `wp_signon()`, capability gate, no hardcoded credential changes, and all non-change boundaries.
5. Extend the focused test to prove: an otherwise-valid login submission on a non-Admin-Station page is ignored; no client redirect field can alter destination; success/failure return to the exact Admin Station page; no path can fall back to `/wp-admin/` or `/wp-login.php`.
6. Push only the correction to the existing review branch, record new exact SHA/files/tests here, set **AWAITING CHATGPT REVIEW**, and stop.

## Historical references
- `6b083e3f` frontend Command Centre login gate.
- `cabf924b` branded single login UI.
- `34b5858a` historical `wp_signon()` / platform-manager flow.
- `34c8175b` deliberate Command Centre retirement.

## Browser validation after source/deploy
Required before closure: logged-out Admin Station gate, bad credentials generic error, valid platform-manager login to Admin Station, unauthorized account denied without WP admin, show/hide password, refresh/session persistence, and direct confirmation that no visible `/wp-login.php` or `/wp-admin/` navigation occurs.
