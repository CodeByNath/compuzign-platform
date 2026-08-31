# Admin Station branded login gate

## Status
- **AWAITING LIVE VALIDATION — pushed to `main`, deploy succeeded.**
- `main` now at `f2bc48ae4a6a8998a33a0dd84cdfcf0bb0e14e47` — exact approved head, pushed as a plain fast-forward, nothing else touched.
- GitHub Actions: **Deploy to Hostinger**, run #927 (`33444463110`), event `push`, head SHA `f2bc48ae`, conclusion **success**.
- Auditor verdict: **Proceed with safeguards**.

## Goal
Admin Station URL → branded CompuZign login → WordPress auth/session underneath → `manage_compuzign` check → existing Admin Station. No visible WordPress login/dashboard journey; no Command Centre resurrection.

## Accepted implementation
- `PlatformAccess` remains capability/account authority; no credential/provisioning change.
- Logged-out Admin Station renders branded login; unauthorized logged-in users render product-styled denied state.
- `wp_signon()` runs at `template_redirect` before output; nonce is Admin-Station scoped; auth failures are generic.
- Current Admin Station field/button/token system is reused; no retired Command Centre route/assets/components.
- Login handler now processes only when the queried singular page actually contains `[compuzign_admin_station]`.
- Client redirect authority is removed entirely: no redirect hidden field remains.
- Return destination is derived server-side from the current Admin Station request, with stale `login_error` stripped.
- Redirect validation uses an explicit `home_url('/')` fallback and does not call `wp_safe_redirect()` / `admin_url()`, so this flow cannot fall into the WP-admin journey.
- No Station Manager, CRM, pricing, identity, persistence, quote/customer behavior change.

## Independent audit
Compared `main@57dc0fbf` → `f2bc48ae`: 2 commits ahead, 0 behind, scoped to Admin Station auth/module/templates/styles, plugin registration, focused test, code map, generated CSS.

Correction-only compare `d3806fa0` → `f2bc48ae` changes only login template, `AdminStationAuth`, `AdminStationModule`, and focused test. Source review confirms `is_singular()` + `has_shortcode(..., AdminStationModule::SHORTCODE)` page gating and server-derived redirect handling.

Claude reports: PHP lint clean; `tsc` + build clean; focused login test **26/26 pass**; docs check pass. Existing unrelated PHP/CSS failures remain unchanged.

## Claude report — pushed to `main`

`review/admin-station-login-gate@f2bc48ae` pushed to `main` as a plain fast-forward (`git push origin review/admin-station-login-gate:main`), `main@57dc0fbf` → `main@f2bc48ae`, no rewrite, nothing beyond the approved 2 commits.

GitHub Actions **Deploy to Hostinger** fired on that push: run #927, id `33444463110`, head SHA `f2bc48ae`, status `completed`, conclusion **success**.

## Claude next action
None from this side. Remaining step is Nath's live validation (the 7 items below) on the deployed site before this phase can close.

## Live validation required after deploy
1. Logged-out Admin Station shows branded login gate.
2. Bad credentials show only generic error.
3. Valid `cz_platform_manager` login returns directly to Admin Station.
4. Unauthorized logged-in account sees access denied, never WP admin.
5. Show/hide password works.
6. Refresh keeps authenticated session.
7. No visible `/wp-login.php` or `/wp-admin/` navigation occurs.
