# Admin Station — Logout Redirect

## Status
- **SOURCE PUSH APPROVED**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Live validator: **Nath**
- Production base: `9d2292a8ba0c2256229e3494c7298aedceb979fa` (failed live validation)
- Approved corrected topic head: `8011e03e5fd7fba5d1f84b0cac03f5a01d541410`
- Verdict: **Proceed**

## Required outcome
Admin Station User-menu logout must complete directly and return to the actual frontend Admin Station login gate. It must not show the WordPress logout confirmation page, standard WordPress login, or `/wp-admin/`.

## Previous live failure
Production `9d2292a8...` placed the HTML-encoded `wp_logout_url()` into JavaScript. The browser showed literal `&amp;` in the logout URL, so WordPress could not read the intended nonce and redirect parameters correctly.

## Independent reviewer audit
Reviewer independently compared `9d2292a8...8011e03e` and inspected the changed source and focused regression.

The correction is limited to:
- `src/Core/AssetLoader.php`
- `tests/admin-station-logout-redirect.php`

Approved behavior:
- canonical Admin Station destination logic is unchanged;
- `wp_logout_url()` remains the logout/nonce authority;
- the HTML-encoded logout URL is decoded once with `wp_specialchars_decode(..., ENT_QUOTES)` and sanitized with `esc_url_raw()` before JSON/JS serialization;
- no hard-coded `/studio/`, raw `REQUEST_URI`, custom nonce, custom logout endpoint, or client-side session logic.

The regression proves no literal `&amp;` remains and that `_wpnonce` and `redirect_to` parse under their correct names while `redirect_to` remains the canonical Admin Station permalink.

Builder reports all focused checks passed: PHP lint, logout regression, login-gate regression, and docs check.

## Next action
Builder may move only exact reviewed candidate `8011e03e5fd7fba5d1f84b0cac03f5a01d541410` to `main` and run the normal deployment pipeline. Any source change invalidates this approval.

After deployment, set **AWAITING LIVE VALIDATION** and ask Nath to verify: clicking Log out does not show WordPress confirmation; logout completes directly; landing page is the Admin Station login gate.
