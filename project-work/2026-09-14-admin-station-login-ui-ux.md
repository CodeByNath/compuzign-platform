# Admin Station Login UI/UX

## Status
- **AWAITING USER PRODUCTION APPROVAL**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Reviewer verdict: **Proceed with safeguards**
- Production `main`: `b537ea96e426476ca5b636d6060e4821d9057bdb`
- Reviewed topic head: `44c4a1b5103475d855b42c735fe16b1ff207c6a5` (`admin-login-ui`)

## Goal
Redesign the existing Admin Station login gate only: fixed dark/navy screen, blue glow, centered translucent card, `CZ` / `CompuZign` / `ADMIN STATION`, username/password icons, accessible Show/Hide, blue Sign in action, divider, and exact footer `Powered by WeeraXStudios`.

## Must preserve
WordPress auth/session host, nonce + POST flow, `wp_signon()` path, same-page/server-derived redirect, capability gate, generic auth error, autocomplete/required/autofocus behaviour, accessible password toggle, and session persistence. No social login, forgot-password, signup, marketing copy, or unrelated Admin Station changes.

## Reviewer source audit
Candidate is one commit ahead of production and based directly on `b537ea96`. The actual pushed diff changes only:
- `app/modules/admin-station/templates/login-gate.php`
- `resources/ts/admin-station/styles/admin-station-tokens.css`
- `resources/ts/admin-station/styles/admin-station.css`
- rebuilt `dist/css/admin-station.css`

The template now supplies the existing `.cz-admin-station` dark-theme root so the existing station tokens and shared `cz-tf-*` / `cz-admin-btn` foundations resolve. New login-only visual tokens remain in the Admin Station token sheet. Field icons and presentation wrappers do not replace the shared field system. The password toggle still resolves the input through `previousElementSibling`; auth names, nonce markup, required/autocomplete, autofocus branches, generic error, submit semantics, and toggle accessibility remain intact.

No identity, persistence, pricing, Station lifecycle, drawer, endpoint, or domain authority is touched. Existing Code Maps remain accurate.

Builder evidence recorded: TypeScript clean, build successful, docs check passed. The CSS contract's six reported failures are pre-existing `cz-rate-sheet-tool__*` findings reproduced on unmodified `main`; no new contract failure is attributed to this candidate.

## Safeguard / next action
Do **not** claim visual acceptance yet. `main` is still the old SHA, so the topic candidate is not the deployed Hostinger runtime and a live browser check cannot validate this candidate yet.

Per `project-work/AGENTS.md`, production/main requires Nath's separate approval. No further source correction is requested. Once Nath explicitly approves the production push, Builder may fast-forward/push `main` to exact SHA `44c4a1b5103475d855b42c735fe16b1ff207c6a5`, record the resulting deployment run, then stop at **AWAITING LIVE VALIDATION**. Reviewer will then validate desktop + mobile live login UI before closure.
