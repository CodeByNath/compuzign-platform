# Admin Station branded login gate

## Status
- **CLOSED — accepted live 2026-09-01.**
- Production `main` = `7683a2f1b8d3b87819241f59d096e13a0786df28`.
- Deploy: **Deploy to Hostinger** run #928 (`33488372752`), exact head SHA `7683a2f1`, completed/success, attempt 1.
- Final auditor verdict: **Proceed**.

## Accepted behavior
- Admin Station URL -> branded CompuZign login -> WordPress auth/session underneath -> `manage_compuzign` check -> existing Admin Station.
- No visible `/wp-login.php` or `/wp-admin/` journey.
- Page-scoped POST handling, nonce, generic auth error, `wp_signon()`, server-derived redirect, `home_url('/')` fallback, capability handling, Show/Hide behavior, and session persistence remain unchanged.
- No Station Manager, CRM, pricing, identity, persistence, quote/customer, provisioning, or auth architecture change.

## Accepted presentation
- Existing `cz-tf-*` field system and `cz-admin-btn*` button system reused.
- Login styling remains scoped to `cz-station-login-gate*`.
- Existing `--station-*` Admin Station tokens drive surface, spacing, hierarchy, field scale, password toggle, primary action, focus and elevation.
- No customer `--cz-color-*` styling or second field/button system.

## Independent production/deploy verification
- GitHub `main` independently resolves to exact `7683a2f1b8d3b87819241f59d096e13a0786df28`.
- GitHub Actions run #928 / `33488372752` independently reports `Deploy to Hostinger`, branch `main`, exact head SHA `7683a2f1b8d3b87819241f59d096e13a0786df28`, status `completed`, conclusion `success`, attempt 1.

## Live acceptance
Nath reports browser validation is complete and the deployed login is acceptable for now. Further UI refinement is deliberately deferred to later work; it is not a defect or blocker for this phase.

No further source change is requested. The completed `review/admin-station-login-gate` branch may be removed after confirming its tip is contained in `main`.
