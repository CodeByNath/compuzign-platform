# Admin Station — Logout Redirect

## Status
- **READY FOR BUILDER**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Live validator: **Nath**
- Current production base: `64a8e772085b19b0f907460ca2c31d868e779438`

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
