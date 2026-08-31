# Admin Station branded login gate

## Status
- **AWAITING CHATGPT REVIEW — Phase 1 implemented.**
- Production base (unchanged): `main@57dc0fbfe4aa7c0b93568dba925b9c29dcf4ff49`.
- Review head: `review/admin-station-login-gate@d3806fa0`, pushed, 1 commit over production.
- Source push: **NOT APPROVED / NOT DONE**.
- Auditor verdict on the instruction: **Proceed with safeguards** (this report addresses each).

## Goal
Allow a platform/client tester to open the existing **Admin Station URL** directly and authenticate there without being sent through visible `/wp-login.php` or `/wp-admin/` UI. WordPress remains the underlying auth/session host; Admin Station remains the sole product admin frontend.

## History/source evidence
Use history as reference, not as code to restore wholesale:
- `6b083e3f` — frontend Command Centre login gate.
- `cabf924b` — branded single login flow; historical `AdminModule::renderLoginForm()`.
- `34b5858a` — `wp_signon()` login handling + `cz_platform_manager`/`manage_compuzign` flow.
- `34c8175b` — deliberately removed the Command Centre frontend/router when Admin Station became the sole admin frontend.

Current authority:
- `Core\PlatformAccess` owns `manage_compuzign` and `cz_platform_manager`.
- `AdminStationModule` owns `[compuzign_admin_station]` and currently emits only a plain gate for logged-out/unauthorized users.

## Claude Phase 1 instruction
1. Read current `AdminStationModule`, `PlatformAccess`, `AssetLoader`, Admin Station Code Map/styles, and the historical files above before editing.
2. Add a **branded Admin Station login gate** for logged-out visitors to the Admin Station page. Adapt the historical visual language as needed, but use the current Admin Station styling/token ownership and avoid resurrecting Command Centre assets/components/routes.
3. Authentication must run early enough to set cookies safely, use WordPress `wp_signon()`, nonce verification, sanitized username handling, same-page safe redirect, and generic invalid-credential feedback. No credential values in HTML/JS/logs/URLs.
4. After authentication, require current `PlatformAccess::CAP`; unauthorized logged-in users get a product-styled access-denied state, not WP admin.
5. Preserve developer/admin WordPress behavior outside the Admin Station page. Do not intercept global `wp-login.php`, globally redirect wp-admin, or recreate `AdminRouter`.
6. **Do not add, change, rotate, expose, or rely on hardcoded usernames/passwords in this phase.** Do not change `PlatformAccess::provisionDefaultUser()` yet; credential/account policy is a separate audited decision.
7. Keep Admin Station route/mount, Station Manager, CRM, pricing, identity, persistence, quote/customer behavior unchanged.
8. Add focused contracts/tests for logged-out gate, nonce/auth handling, capability gate, safe redirect, no Command Centre resurrection, and no credential leakage. Update the Admin Station Code Map if runtime responsibility changes.
9. Push implementation to the existing audit/review mechanism only as needed, record exact SHA/files/tests here, set **AWAITING CHATGPT REVIEW**, and stop before `main`.

## Acceptance target
`Admin Station URL → branded CompuZign login → WP auth/session underneath → manage_compuzign check → existing Admin Station`, with no visible WordPress login/dashboard journey for the platform tester.

## Claude report — `d3806fa0`

### What shipped, against each instruction
1. Read `AdminStationModule.php`, `PlatformAccess.php`, `AssetLoader.php`, the Admin Station Code Map, and all four historical commits (`6b083e3f`, `cabf924b`, `34b5858a`, `34c8175b`) before writing anything.
2. New branded login gate, logged-out visitors only. Visual structure (centered card, brand mark, username/password fields, show/hide toggle, error slot) adapts `cabf924b`'s historical layout, but every control now resolves through the CURRENT Admin Station token/field system: `cz-tf-field`/`cz-tf-label`/`cz-tf-control cz-tf-input` (the drawer kit's own field system) for the inputs, `cz-admin-btn cz-admin-btn--primary` for submit, `cz-admin-error-msg` for the failure message — no new field or button style invented. Only the page-centering card/brand-mark classes are new (`cz-station-login-gate*`), using existing `--station-*` tokens throughout (`--station-card-bg`, `--station-card-radius`, `--station-shadow`, `--station-accent`, `--station-focus-ring`, …), swept directly against every file in `atomic-engine/css/` for zero name collision (the exact CRM-1C lesson applied up front this time).
3. `AdminStationAuth.php`, hooked at `template_redirect` (fires before any output — safe for `wp_signon()`'s auth cookies). Nonce-verified (`wp_verify_nonce` against a new, Admin-Station-scoped action, never the retired `cz_login` action name), `sanitize_user()` on the username, raw password passed through unmodified to `wp_signon()`. Redirect target is carried as a hidden field captured from the actual current page (`home_url(REQUEST_URI)`) at render time — never a fixed slug — and `wp_safe_redirect()` itself is the actual security boundary against an off-site target. Failure redirects with a bare `login_error=1` flag; the underlying `WP_Error`'s own code/message (which would distinguish unknown-username from wrong-password) never reaches the redirect URL or the rendered page — verified by test.
4. A logged-in visitor without `PlatformAccess::CAP` renders `access-denied.php` — brand mark + one `cz-admin-error-msg` line — never WP admin, never a redirect anywhere.
5. No global `wp-login.php` interception, no wp-admin redirect, no `AdminRouter` — confirmed by an explicit structural test (see below). The gate exists only inside `AdminStationModule::renderShortcode()`'s own logged-out branch.
6. `PlatformAccess::provisionDefaultUser()` and the `accountmanager` default account are completely untouched — confirmed by an explicit structural test.
7. No Station Manager, CRM, pricing, identity, persistence, or quote/customer file touched — the diff is scoped to `AdminStationModule.php`, the new `AdminStationAuth.php`, two new templates, `Plugin.php`'s one registration line, and CSS.
8. New `tests/admin-station-login-gate.php` (18 checks): non-submission no-ops (GET, missing nonce field, invalid/stale nonce — all identical, no distinguishing feedback), successful `wp_signon()` redirects to the exact submitted page, failed `wp_signon()` redirects to the same page with `login_error=1` only (never the `WP_Error`'s own code/message, never the submitted username/password), an unknown-username failure and a wrong-password failure produce an *identical* redirect, safe-redirect-target defaulting (empty field → site home) and `login_error` stripping before a retry, and a structural block asserting neither new file references any of `AdminRouter`, `admin-command-centre`, the retired `compuzign_admin` shortcode, `admin_menu`, `login_redirect`, `dashboardRedirect`, `wpadminbar`, `wp-toolbar`, or `install_plugins` — plus that the shortcode still gates on `PlatformAccess::CAP` and never touches `provisionDefaultUser`. Admin Station Code Map updated (`docs/code-map/admin-station.md`) with the new files and the login-gate/access-denied branches.
9. Pushed to `review/admin-station-login-gate` only (new branch — this is a new work item, not a new round of an existing one, consistent with the two-branch-plus-topic-branch policy). Recording exact SHA/files/tests here now; **not pushed to `main`**.

### Evidence (from plugin root)
- `php -l` on every new/changed PHP file — clean.
- `npx tsc --noEmit`, `npm run build` — clean (312 modules; only `admin-station.css` changed, no JS).
- `php tests/admin-station-login-gate.php` — 18/18 pass.
- Full existing PHP test sweep (`for f in tests/*.php; do php "$f"; done`) — the 5 pre-existing failures (`quote-view-email-link.php`, `quote-view-http-boundary.php`, `service-route-baseline.php`, `tier-capability-invariants.php`, `tier-occupant-first-save.php`) reproduce identically with this branch's changes stashed out, confirming they predate this work and are unrelated.
- `npm run contract:admin-station-css` — same 6 pre-existing `cz-rate-sheet-tool__*` findings as every prior round, unrelated; the new `cz-station-login-gate*` classes resolve cleanly (correctly traced to the new PHP templates).
- `npm run docs:check` — pass.

### Not run
Live WordPress/browser session — no local WP environment exists in this workspace. The actual login round-trip (form submit → `wp_signon()` → redirect → Admin Station render), the access-denied state for a real non-platform account, and the show/hide password toggle are all unverified in a real browser. This needs the same live pass every CRM-1C round needed before it can close.
