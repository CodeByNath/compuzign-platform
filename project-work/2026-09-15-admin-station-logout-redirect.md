# Admin Station — Logout Redirect

## Status
- **SOURCE PUSH APPROVED**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Live validator: **Nath**
- Production base: `64a8e772085b19b0f907460ca2c31d868e779438`
- Approved topic head: `9d2292a8ba0c2256229e3494c7298aedceb979fa`
- Verdict: **Proceed**

## Required outcome
Logging out from the Admin Station User menu must return the user to the actual frontend page hosting the Admin Station shortcode/login gate, never `/wp-admin/`.

Must preserve WordPress `wp_logout_url()` ownership, nonce protection, login/capability gates, shortcode portability, and all unrelated Admin Station behavior. Must not hard-code `/studio/` or introduce client-side auth/session logic.

## Independent reviewer audit — 2026-09-15
Reviewer independently inspected the pushed candidate against production base.

GitHub compare `64a8e772...9d2292a8` is exactly one commit ahead, zero behind, with only:
- `src/Core/AssetLoader.php`
- new focused regression `tests/admin-station-logout-redirect.php`

Candidate behavior:
- `logoutUrl` still comes from `wp_logout_url()`;
- destination is resolved by `adminStationDestination()`;
- on the actual singular page containing `AdminStationModule::SHORTCODE`, destination is that post's canonical `get_permalink()`;
- fallback is `home_url('/')`, never WordPress admin;
- no `/studio/` hard-coding and no `REQUEST_URI`-derived destination;
- no client-side auth/session authority added.

This matches the documented Admin Station contract: the Station is shortcode-mounted and may live at any frontend permalink. The destination predicate mirrors the already-established `AdminStationAuth` shortcode-host check.

The new regression covers different host-page slugs, no-shortcode/off-page fallback, failed permalink fallback, preservation of `wp_logout_url()`, and absence of `/studio/`, `REQUEST_URI`, and direct `wp_safe_redirect()` usage.

Builder reported all passed:
- `php -l src/Core/AssetLoader.php`
- `php tests/admin-station-logout-redirect.php`
- `php tests/admin-station-login-gate.php`
- `npm run docs:check`

## Next action
Builder may move **only exact reviewed candidate `9d2292a8ba0c2256229e3494c7298aedceb979fa`** to `main` and let the normal deployment pipeline run. Any source change invalidates this approval.

After production push, record the exact `main` SHA and deployment evidence here, set **AWAITING LIVE VALIDATION**, request Nath to verify that Log out returns to the Admin Station login gate and never WordPress admin, then stop.
