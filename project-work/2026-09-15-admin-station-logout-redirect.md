# Admin Station — Logout Redirect

## Status
- **SOURCE PUSH NOT APPROVED — live failure 2026-09-15**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Live validator: **Nath**
- Production `main`: `9d2292a8ba0c2256229e3494c7298aedceb979fa`
- Deployment: GitHub Actions "Deploy to Hostinger" run #1033 — **Success**
- Verdict: **Proceed with bounded correction**

## Required outcome
Admin Station User-menu **Log out** must perform the WordPress logout and return directly to the actual frontend Admin Station page/login gate. It must never show WordPress's logout-confirmation page, `/wp-admin/`, or the standard WordPress login screen.

Must preserve WordPress auth/session ownership, nonce protection, shortcode portability, login/capability gates, and all unrelated Admin Station behavior.

## Live failure evidence — Nath
Production SHA `9d2292a8...` deployed successfully but failed live validation on mobile Chrome:
1. Clicking **Log out** opens WordPress's native confirmation page: “You are attempting to log out… Do you really want to log out?”
2. Browser URL visibly contains `wp-login.php?action=logout&...` with literal `&amp;redirect_to=...`.
3. Confirming logout lands on the standard WordPress login page instead of the Admin Station login gate.

## Root cause now evidenced
`wp_logout_url()` returns an **HTML-encoded URL** (WordPress documents this explicitly; `wp_nonce_url()` applies `esc_html()`). That is correct for an HTML `href`, but this project serializes the value into `window.CompuZignConfig` for JavaScript.

Current source does:
`esc_url_raw(wp_logout_url($this->adminStationDestination()))`

The HTML entity encoding survives into the JS string. The live browser proves this by showing literal `&amp;redirect_to=...`. That changes query parameter names (e.g. `amp;redirect_to` / potentially `amp;_wpnonce`), so WordPress cannot read the intended nonce/redirect normally. The confirmation screen and lost redirect are therefore expected consequences.

## Builder correction
On the same work item:
1. Preserve the already-approved canonical `adminStationDestination()` logic. Do **not** revert to `REQUEST_URI` or hard-code `/studio/`.
2. Preserve `wp_logout_url()` and WordPress nonce/session ownership.
3. Convert the HTML-encoded logout URL into a raw URL suitable for JSON/JavaScript **before** it is placed in runtime config. Use the narrowest WordPress/PHP-safe approach (for example, decode HTML entities once, then URL-sanitize for non-display use).
4. Do not hand-build a logout URL or nonce and do not bypass WordPress logout handling.
5. Extend the focused regression to prove the runtime URL contains normal `&redirect_to=` and `&_wpnonce=` parameters, contains no literal `&amp;`, and still points back to the canonical shortcode-hosting permalink.
6. Keep the change scoped to logout URL serialization plus its focused test.
7. Run PHP lint, logout regression, existing login-gate regression, and docs check.
8. Push the corrected topic candidate, record exact SHA/evidence here, set **AWAITING REVIEWER REVIEW**, and stop.

## Reviewer safeguards
**Must preserve:** canonical shortcode-hosting permalink resolution; `wp_logout_url()`; nonce protection; WordPress session authority.

**Must remove:** HTML-entity leakage into the JavaScript logout URL; WordPress confirmation/login detour.

**Must not substitute:** hard-coded slug, client-side logout/session logic, custom hand-built nonce/logout endpoint.
