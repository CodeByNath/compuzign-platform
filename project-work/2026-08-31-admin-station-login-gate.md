# Admin Station branded login gate

## Status
- **AWAITING CHATGPT REVIEW — visual refinement implemented on `review/admin-station-login-gate`.**
- Production `main` = `f2bc48ae4a6a8998a33a0dd84cdfcf0bb0e14e47` (base for this change; not yet pushed to `main`).
- Review SHA = `7683a2f1b8d3b87819241f59d096e13a0786df28` on branch `review/admin-station-login-gate` (pushed to origin).
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

## Claude implementation report (2026-09-01)

### Changed files
- `app/modules/admin-station/templates/login-gate.php` — added the existing `cz-tf-control--lg` field-system size modifier to the username and password inputs. No new field type, no new class, no markup restructuring, no auth/controller code touched.
- `resources/ts/admin-station/styles/admin-station.css` — refined only the pre-existing `cz-station-login-gate*` rule block (no new class names added):
  - Outer gate: added a subtle `--station-accent-soft-bg` radial backdrop behind the centered card (fixes the "large dead space" complaint) — a container background, not a control paint.
  - Card: slightly wider (360px → 380px), more generous top padding for breathing room, unchanged border/radius/shadow tokens.
  - Brand block: added a hairline `--station-card-divider` under the mark/name/sub group so the form reads as a distinct section, larger mark (44px → 52px) reusing `--station-card-icon-radius` (the same radius family the entity-card medallions use) plus a soft accent glow shadow, larger brand name (`--station-text-lg` → `--station-text-xl`), and an uppercase/tracked "Admin Station" label for a deliberate brand hierarchy.
  - Form: field gap 16px → 20px to match the now-larger (`--lg`) fields.
  - Show/Hide toggle: repositioned into a proper pill (`--station-pill-radius`) with an accent-soft hover state instead of a bare text button, so it reads as a control rather than stray text.
  - Submit: height/font now match the `--station-field-min-h-lg` / `--station-field-font-lg` tokens the fields use, for a stronger, size-consistent primary action — colour/background still entirely inherited from the unmodified shared `cz-admin-btn--primary`.
- `dist/css/admin-station.css` — regenerated via `npm run build` (normal source workflow only, no hand edits).

### What was NOT touched
- `AdminStationAuth.php`, `AdminStationModule.php` — zero changes, not even read-adjacent edits.
- The `cz-tf-*` field system and `cz-admin-btn*` button system definitions in `drawer-kit.css` — zero changes. Only an existing modifier class (`cz-tf-control--lg`) was applied in the template, and only existing `--station-*` tokens were referenced (no new token, no `--cz-color-*`, no raw hex).
- No new CSS class names were introduced anywhere, so there was nothing new to grep against `atomic-engine/css/` for collision — the class surface is unchanged from before.

### Focused validation (from plugin root)
- `npm run contract:admin-station-css` — same 6 pre-existing failures as on `main` before this change (all unrelated `cz-rate-sheet-tool__*` classes), confirmed via `git stash` diff; **zero new failures** introduced by this change.
- `php tests/admin-station-login-gate.php` — all 30 checks pass unchanged (auth/redirect/nonce/error-genericity/no-retired-Command-Centre-symbol behavior untouched).
- `npm run build` — succeeds, `dist/css/admin-station.css` regenerated.
- `npm run docs:check` — passes (110 Markdown files, 39 Code Maps, 22 numbered history records).
- Browser inspection not performed — no WordPress runtime available locally (per `no-unevidenced-claims-about-live` policy, this is a code-level review pending live validation after merge/deploy).

### Review SHA
`7683a2f1b8d3b87819241f59d096e13a0786df28` on `review/admin-station-login-gate` (pushed to `origin/review/admin-station-login-gate`). Not merged to `main`; awaiting audit approval per this doc's acceptance criteria.
