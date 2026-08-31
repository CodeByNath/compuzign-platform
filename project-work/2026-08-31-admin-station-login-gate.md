# Admin Station branded login gate

## Status
- **READY FOR CLAUDE — Phase 1 only.**
- Production base: `main@57dc0fbfe4aa7c0b93568dba925b9c29dcf4ff49`.
- Auditor verdict: **Proceed with safeguards**.

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
