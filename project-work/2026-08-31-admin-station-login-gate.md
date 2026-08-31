# Admin Station branded login gate

## Status
- **AWAITING LIVE VALIDATION — production and deploy independently verified.**
- Production `main` = `f2bc48ae4a6a8998a33a0dd84cdfcf0bb0e14e47`.
- Deploy: **Deploy to Hostinger** run #927 (`33444463110`), exact head SHA `f2bc48ae`, event `push`, completed/success, attempt 1.
- Auditor verdict: **Proceed with safeguards**.

## Goal
Admin Station URL → branded CompuZign login → WordPress auth/session underneath → `manage_compuzign` check → existing Admin Station. No visible WordPress login/dashboard journey; no Command Centre resurrection.

## Accepted implementation
- `PlatformAccess` remains capability/account authority; no credential/provisioning change.
- Logged-out Admin Station renders branded login; unauthorized logged-in users render product-styled denied state.
- `wp_signon()` runs before output at `template_redirect`; nonce is Admin-Station scoped; auth failures are generic.
- Login POST is processed only when the queried singular page itself contains `[compuzign_admin_station]`.
- Client redirect authority is removed; return destination is server-derived from the current Admin Station request with stale `login_error` stripped.
- Redirect validation uses explicit `home_url('/')` fallback; no `wp_safe_redirect()` / `admin_url()` path exists in this flow.
- Current Admin Station field/button/token system is reused; no retired Command Centre routes/assets/components.
- No Station Manager, CRM, pricing, identity, persistence, quote/customer behavior change.

## Independent verification
GitHub `main` independently resolves to exact `f2bc48ae4a6a8998a33a0dd84cdfcf0bb0e14e47`.

GitHub Actions run #927 / `33444463110` independently reports `Deploy to Hostinger`, branch `main`, exact head SHA `f2bc48ae4a6a8998a33a0dd84cdfcf0bb0e14e47`, status `completed`, conclusion `success`, attempt 1.

No further source correction is requested before live validation.

## Live validation required before closure
1. Logged-out Admin Station shows branded login gate.
2. Bad credentials show only generic error.
3. Valid `cz_platform_manager` login returns directly to Admin Station.
4. Unauthorized logged-in account sees access denied, never WP admin.
5. Show/hide password works.
6. Refresh keeps authenticated session.
7. No visible `/wp-login.php` or `/wp-admin/` navigation occurs.

If all seven pass, mark this work **CLOSED** and remove the completed review branch only after confirming it is contained in `main`.
