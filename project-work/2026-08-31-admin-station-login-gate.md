# Admin Station branded login gate

## Status
- **READY FOR CLAUDE — visual refinement only.**
- Production `main` = `f2bc48ae4a6a8998a33a0dd84cdfcf0bb0e14e47`.
- Existing auth/session behavior is accepted; Nath reports the deployed login works. Current request is presentation polish only.
- Auditor verdict: **Proceed with safeguards**.

## Locked behavior — do not change
- Admin Station URL -> branded CompuZign login -> WordPress auth/session underneath -> `manage_compuzign` check -> existing Admin Station.
- No visible `/wp-login.php` or `/wp-admin/` journey.
- Keep the current page-scoped POST handling, nonce, generic auth error, `wp_signon()`, server-derived redirect, `home_url('/')` fallback, password show/hide behavior, capability handling, and session behavior exactly as implemented.
- No Station Manager, CRM, pricing, identity, persistence, quote/customer, account-provisioning, or auth architecture changes.

## Visual issue found live
The gate works, but the current screen is too bare/flat: large dead space, weak visual hierarchy, plain field presentation, and the form does not yet feel like a deliberate Admin Station surface.

## Claude implementation instruction
Refine **only the login-gate presentation** using the existing Admin Station design system.

1. Read `docs/code-map/admin-station.md`, `docs/code-map/admin-station-styles.md`, the current `login-gate.php`, Admin Station tokens, shell CSS, and shared drawer/field/button CSS before editing.
2. Keep the existing `cz-tf-*` field system and `cz-admin-btn*` button system. Do not create a second field/button system and do not copy customer-facing Atomic Engine styles.
3. Use only existing `--station-*` Admin Station palette/shape/depth/focus/surface tokens (and already-established shared Admin private tokens where appropriate). No raw/new brand colours and no `--cz-color-*` customer tokens.
4. Make the login feel intentionally part of Admin Station: compact centered composition, clearer brand hierarchy, a contained/elevated Admin surface, improved spacing/rhythm, proper field widths/padding, stronger primary Sign in treatment, and polished Show/Hide placement. Keep it restrained, not decorative or flashy.
5. Preserve responsive behavior and accessibility: labels remain explicit, keyboard focus visible, contrast remains valid, password toggle retains `aria-*`, error remains generic, and mobile viewport must not overflow.
6. Scope styles to `cz-station-login-gate*`; do not alter global Admin Station controls just to make this one screen look better.
7. Do not touch auth/controller logic unless a visual-only template class hook absolutely requires it; if so, no behavior change.
8. Update focused tests/contracts only if needed to guard token ownership/no customer-token collision. Build generated CSS only through the normal source workflow.

## Acceptance
- Visually reads as an Admin Station login, not a raw WordPress/form page.
- Existing Admin tokens/primitives are visibly reused.
- No customer Atomic Engine accent/style collision.
- Login, bad-credential error, Show/Hide, successful return to Admin Station, unauthorized state, and session behavior remain unchanged.
- Report changed files, focused validation, exact review SHA, and set **AWAITING CHATGPT REVIEW**. Do not push to `main` before audit approval.
