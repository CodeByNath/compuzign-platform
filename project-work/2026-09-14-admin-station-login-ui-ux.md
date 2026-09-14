# Admin Station Login UI/UX

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: **Claude** (assigned by Nath)
- Reviewer: **ChatGPT independent auditor**
- Verdict: **Proceed with safeguards**
- Production base: `b537ea96e426476ca5b636d6060e4821d9057bdb`
- Pushed Builder topic head: `44c4a1b5103475d855b42c735fe16b1ff207c6a5` (branch `admin-login-ui`)

## Branch housekeeping first
Done. Verified `origin/admin-ui-refinement` (`b537ea96`) was identical to `origin/main` (`git merge-base --is-ancestor`), deleted it from `origin`, then created `admin-login-ui` from `main`. Repo is back to `main` + `Project-work-instructions` + the one active topic branch.

## Goal
Redesign the existing Admin Station login gate to match Nath's approved reference as closely as practical in the real responsive UI.

Visual target:
- full-page near-black / deep-navy background;
- restrained blue atmospheric glow behind the card;
- one centered, width-bounded dark translucent/navy login card;
- large rounded corners, thin blue/accent edge, subtle blue glow/elevation;
- centred brand stack: `CZ` → `CompuZign` → `ADMIN STATION`;
- rounded Username field with user icon;
- rounded Password field with lock icon and `Show` / `Hide` control on the right;
- large rounded blue `Sign in` button;
- thin divider near the bottom;
- footer text exactly: `Powered by WeeraXStudios`.

Do not add social login, forgot-password links, signup, marketing copy, or extra controls.

## Must preserve
Existing authentication behaviour is not part of this redesign. Preserve:
- WordPress auth/session host;
- nonce and POST flow;
- `wp_signon()` path;
- same-page/server-derived redirect;
- capability gate;
- generic auth error;
- username/password autocomplete and required behaviour;
- existing autofocus behaviour;
- accessible Show/Hide state and labels;
- session persistence.

## Implementation boundary
Start from the existing `login-gate.php` and scoped `.cz-station-login-gate*` styles. Reuse the existing Admin Station field/button foundation and tokens where possible. Any special visual treatment needed to reach the approved design must remain scoped to the login gate. Do not create a second global field/button system or change platform/domain architecture.

Use existing inline/vector icon language where available; no emoji or raster icons.

## Acceptance evidence

Changed files (topic `admin-login-ui` @ `44c4a1b5`):
- `app/modules/admin-station/templates/login-gate.php`
- `resources/ts/admin-station/styles/admin-station-tokens.css`
- `resources/ts/admin-station/styles/admin-station.css`
- `dist/css/admin-station.css` (rebuilt)

Source diff summary:
- Root markup now carries `cz-admin-station cz-station-login-gate` with `data-station-theme="dark"`. The template renders outside the React shell, so previously `.cz-station-login-gate`'s `var(--station-*)` references resolved to nothing (no wrapper ever supplied them) — adding the wrapper is what makes the existing field/button/token foundation actually apply here, per the "reuse existing foundation" instruction.
- Added a `--station-login-*` token family in `admin-station-tokens.css` (glow, translucent card bg, card border, card radius) — fixed-dark by design, independent of light/dark theme, referenced only from the login gate rules. (The contract script requires all tokens live in the token sheet; a component-local `--login-*` custom property block was tried first and rejected by `contract:admin-station-css` — see Focused validation.)
- Username and password inputs each got a `.cz-station-login-gate__control-wrap` with an inline Heroicons-v2-solid-style SVG (user / lock-closed paths, `currentColor`, 24×24 viewBox, matching the existing icon set's convention) positioned left; input gets `padding-left` only (no `border`/`background`/`color`/`radius` touched on `.cz-tf-input` itself, per the style-ownership boundary).
- Added `.cz-station-login-gate__divider` + `.cz-station-login-gate__footer` ("Powered by WeeraXStudios") after the form.
- No changes to `access-denied.php` (out of scope) or to any `.cz-tf-*`/`.cz-admin-btn*` rule.

Focused validation/build results (from plugin root):
- `npx tsc --noEmit` — clean.
- `npm run build` — succeeded (`dist/css/admin-station.css` 81.42 kB gz 10.87 kB).
- `npm run contract:admin-station-css` — passes for everything this change touched. 6 pre-existing failures remain (`cz-rate-sheet-tool__*` classes styled but unreferenced) — confirmed present on unmodified `main` before this change (stashed and re-ran), unrelated to this work, not fixed here (out of scope).
- `npm run docs:check` — passed, 119 Markdown files / 48 Code Maps. No Code Map text became inaccurate (existing `admin-station.md` description of the login gate still holds).

Authentication behaviour/source: unchanged. Nonce field/name, `wp_signon()` POST path (`AdminStationAuth.php` untouched), same-page/server-derived redirect, capability gate, generic error message and markup, username/password `autocomplete`/`required`, existing autofocus branching, and the Show/Hide toggle script (unchanged, still reads `toggle.previousElementSibling` — still the input, since the new icon sits before the input, not between input and button) are all byte-identical to before. Only presentation markup (wrapper classes/attribute, icon SVGs, footer/divider) was added.

**Outstanding — not done by Builder:** mobile portrait and desktop screenshots. Per standing instruction in this repo, Claude (Builder) does not run browser/UI validation — that is the independent Reviewer's role. Reviewer: please capture/confirm the visual result against the approved reference (mobile portrait + desktop) as part of this review pass; flag back here if the rendered result misses the target and Builder will iterate on the same topic branch.
