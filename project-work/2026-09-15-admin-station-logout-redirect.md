# Admin Station — Logout Redirect

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Live validator: **Nath**
- Production `main`: `9d2292a8ba0c2256229e3494c7298aedceb979fa` (deploy run #1033 succeeded, but failed live validation)
- Corrected topic head: `8011e03e5fd7fba5d1f84b0cac03f5a01d541410` on `admin-station-logout-redirect` (one commit ahead of `main`)

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

## Builder correction result — encoding fix

Confirmed the diagnosis against WordPress core before changing anything: `wp_logout_url()` → `wp_nonce_url()`, whose final statement is `return esc_html( add_query_arg( ... ) )`. `esc_html()` is `_wp_specialchars($text, ENT_QUOTES)`, so every `&` comes back as `&amp;`. `esc_url_raw()` does not undo that — in its `'db'` context it deliberately skips the entity handling `'display'` performs — so the entity survived into `window.CompuZignConfig` exactly as Nath's browser URL showed.

### Change made
`AssetLoader.php` only, in the logout URL's serialization:

```php
private function adminStationLogoutUrl(): string
{
    return esc_url_raw(wp_specialchars_decode(wp_logout_url($this->adminStationDestination()), ENT_QUOTES));
}
```

`wp_specialchars_decode(..., ENT_QUOTES)` is the exact inverse of the `esc_html()` WordPress applied. Extracted as its own private method purely so the generated URL is directly testable; `'logoutUrl'` in the config array now calls it.

Untouched, as required: `adminStationDestination()`'s approved canonical-permalink resolution, `wp_logout_url()`, nonce protection, WordPress session authority. No hand-built logout endpoint or nonce, no client-side auth/session logic, no slug.

### Regression coverage extended
`tests/admin-station-logout-redirect.php` gains a section that invokes `adminStationLogoutUrl()` against a `wp_logout_url()` stub faithful to core (it HTML-encodes its output the same way), then `parse_str()`s the resulting query string — the same thing a server does — and asserts `action`, `_wpnonce`, and `redirect_to` all read back under their own names, that no `amp;`-prefixed name survives, and that `redirect_to` is still the canonical shortcode-hosting permalink. Structural checks added: the decode is still present, and neither `wp-login.php` nor `'log-out'` is hand-built in source (comment-stripped via PHP's tokenizer first, the same convention the login-gate test uses).

**Verified the test actually catches the defect:** run against a throwaway copy of the pre-fix source, 7 checks fail, and the parsed query string reproduces the live symptom exactly — `{"action":"logout","amp;redirect_to":"...","amp;_wpnonce":"..."}`. That is Nath's live failure captured deterministically.

### Checks run (all passed)
- `php -l src/Core/AssetLoader.php`
- `php tests/admin-station-logout-redirect.php`
- `php tests/admin-station-login-gate.php` (unaffected)
- `npm run docs:check`

Commit: `8011e03e5fd7fba5d1f84b0cac03f5a01d541410`.

### Note for Reviewer
This corrects the serialization only. The prior candidate's destination logic was right and is unchanged — the reason live still failed is that the URL carrying it was HTML-encoded, which no amount of destination correctness could have fixed. Worth noting the same encoding trap applies to any future `wp_*_url()`/`wp_nonce_url()` value placed into `window.CompuZignConfig`; `apiRoot`/`contactUrl`/`costBuilderUrl`/`distUrl`/`atomicEngineUrl` are unaffected because none of them pass through `wp_nonce_url()`. I have not broadened the change to guard that generally, since it is outside this work item's scope.
