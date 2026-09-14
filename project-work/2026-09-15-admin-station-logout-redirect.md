# Admin Station — Logout Redirect

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Live validator: **Nath**
- Production base: `64a8e772085b19b0f907460ca2c31d868e779438`
- Topic branch: `admin-station-logout-redirect`, reset from `main` and pushed at `9d2292a8ba0c2256229e3494c7298aedceb979fa` (force-updated — the prior rejected `/studio/` commit is gone from this branch's history)

## Defect
Admin Station User menu **Log out** can send the user to WordPress admin instead of returning to the Admin Station login gate.

Required outcome: after logout, the user lands back on the actual frontend page hosting the Admin Station shortcode/login gate. Never `/wp-admin/`.

## Architecture boundary
WordPress remains auth/session owner. Keep `wp_logout_url()` and nonce-protected logout. Do not add client-side auth/session handling.

Admin Station is shortcode-mounted and must not acquire a fixed-slug dependency. Do **not** hard-code `/studio/` as platform architecture.

The existing attempted branch `admin-station-logout-redirect` changes `AssetLoader.php` to `home_url('/studio/')`. That behavior is not approved as-is.

## Builder task
1. Start from current `main` after branch housekeeping.
2. Inspect `AdminStationAuth`, shortcode/module ownership, `AssetLoader.php`, and the actual frontend page/permalink path used by the mounted Admin Station.
3. Implement the smallest robust logout redirect that resolves to the canonical frontend page hosting Admin Station, preserving portability if that page slug changes.
4. Preserve `wp_logout_url()`, WordPress auth/session authority, User menu behavior, login gate, capability gate, and all unrelated Admin Station behavior.
5. Do not claim `wp_safe_redirect()` foreign-host rejection as root cause unless proven from source/runtime evidence.
6. Add/update focused regression coverage if an existing relevant contract exists; otherwise document why not.
7. Run PHP lint plus relevant focused checks/docs check.
8. Push only the active topic branch, record exact SHA/evidence here, set **AWAITING REVIEWER REVIEW**, and stop.

## Reviewer note
**Must preserve:** WordPress logout ownership, nonce protection, frontend login gate, shortcode portability.

**Must remove:** logout fallback into WordPress admin.

**Must not substitute:** a hard-coded `/studio/` dependency or client-side logout/session mechanism.

## Builder result

### Housekeeping (done first, per instruction)
- Verified the accordion topic (`package-home-accordion-row-backgrounds`) was fully contained in `main` and deleted it, local and remote.
- Reset `admin-station-logout-redirect` to current `main` (`git reset --hard origin/main`) to drop the rejected `/studio/` commit entirely, then force-pushed the clean branch. History no longer contains the rejected candidate.

### Investigation
Read `AdminStationAuth.php`, `AdminStationModule.php`, `AssetLoader.php`, and `tests/admin-station-login-gate.php`. `AdminStationAuth::isAdminStationRequest()` already solves exactly this "which frontend page is Admin Station on" problem for the post-login redirect: `is_singular()` + `get_post()` + `has_shortcode($post->post_content, AdminStationModule::SHORTCODE)` — source-grounded, no slug assumption — and it deliberately avoids `wp_safe_redirect()` (whose own fallback is `admin_url()`).

I did not touch `AdminStationAuth.php` or its test — that work is separately closed/tested, and duplicating ~10 lines of the same predicate into `AssetLoader.php` (rather than refactoring `AdminStationAuth` to share it) keeps this fix scoped to the actual defect instead of reopening approved, tested code.

I also retract my earlier "foreign-host `wp_safe_redirect()` rejection" claim outright — I have no runtime evidence for it, and on reflection it doesn't hold up mechanically either: a `home_url()`-derived URL's host can't fail a same-host check against `home_url()` itself. I don't know the actual prior root cause and am not claiming to.

### Change made
`AssetLoader.php`: `logoutUrl` now passes `wp_logout_url($this->adminStationDestination())` instead of the raw `home_url($_SERVER['REQUEST_URI'])` construction. The new private `adminStationDestination()`:
1. If `is_singular()` and the queried post's own content carries `AdminStationModule::SHORTCODE` (via `has_shortcode()`), returns that post's own `get_permalink()` — the canonical URL, not a hardcoded slug, not the raw request path.
2. Otherwise (or if `get_permalink()` itself returns `false`), falls back to `home_url('/')` — the site's front page, never `/wp-admin/`.

`wp_logout_url()` and WordPress's own nonce/session ownership are unchanged. No client-side auth/session logic added.

### Regression coverage
Added `tests/admin-station-logout-redirect.php`, following the exact convention `tests/admin-station-login-gate.php` established (function stubs + Reflection on the real class + a structural source-text proof block). Covers: resolves the actual queried post's permalink (two different slugs, proving no hardcoding); falls back to the front page when off the Admin Station page, when the page has no shortcode, and when `get_permalink()` returns `false`; and structurally proves `AssetLoader.php` contains no hardcoded `/studio/` string, still calls `wp_logout_url()`, never calls `wp_safe_redirect()`, and resolves via `has_shortcode()`/`AdminStationModule::SHORTCODE`/`get_permalink()` rather than `REQUEST_URI`.

This test isn't wired into `resources/ts/admin-station/CLAUDE.md`'s Validation list — neither is its sibling `admin-station-login-gate.php`, so I matched existing precedent rather than changing that file. Run directly: `php tests/admin-station-logout-redirect.php`.

### Checks run (all passed)
- `php -l src/Core/AssetLoader.php`
- `php tests/admin-station-logout-redirect.php` (new)
- `php tests/admin-station-login-gate.php` (unaffected — confirmed unchanged, still passes)
- `npm run docs:check`

Commit: `9d2292a8ba0c2256229e3494c7298aedceb979fa` on `admin-station-logout-redirect` (force-pushed; branch reset from `main` first, so no other diff exists).
