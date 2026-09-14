# Admin Station Login UI/UX

## Status
- **AWAITING USER PRODUCTION APPROVAL**
- Builder: **Claude / Codex as assigned by Nath**
- Reviewer: **ChatGPT independent auditor**
- Live validator: **Nath**
- Reviewer verdict: **Proceed with safeguards**
- Production `main`: `b537ea96e426476ca5b636d6060e4821d9057bdb`
- Reviewed topic head: `44c4a1b5103475d855b42c735fe16b1ff207c6a5` (`admin-login-ui`)

## Goal
Redesign the existing Admin Station login gate only: fixed dark/navy screen, blue glow, centered translucent card, `CZ` / `CompuZign` / `ADMIN STATION`, username/password icons, accessible Show/Hide, blue Sign in action, divider, and exact footer `Powered by WeeraXStudios`.

## Role boundary
- Builder edits product source, manages the topic branch, performs authorized production push/deployment handoff, and records exact SHAs/evidence.
- Reviewer independently audits plan, architecture, authoritative source, actual pushed diff, validation/deployment evidence, and defects reported from live validation. Reviewer may write only coordination files under `project-work/` on `Project-work-instructions`; product source remains read-only.
- Nath performs live browser validation of the deployed Hostinger WordPress experience and reports pass/fail or defects for reviewer audit.
- WordPress is remote Hostinger runtime/storage. Local Git, pushed GitHub, Actions result, deployed Hostinger, stored runtime state, and live WordPress are separate states.

## Must preserve
WordPress auth/session host, nonce + POST flow, `wp_signon()` path, same-page/server-derived redirect, capability gate, generic auth error, autocomplete/required/autofocus behaviour, accessible password toggle, and session persistence. No social login, forgot-password, signup, marketing copy, or unrelated Admin Station changes.

## Reviewer source audit
Fresh cycle verification: branch set is exactly `main`, `Project-work-instructions`, and one active topic `admin-login-ui`. Topic `44c4a1b5` remains one commit directly ahead of production `b537ea96`, with no divergence.

Actual candidate changes only:
- `app/modules/admin-station/templates/login-gate.php`
- `resources/ts/admin-station/styles/admin-station-tokens.css`
- `resources/ts/admin-station/styles/admin-station.css`
- rebuilt `dist/css/admin-station.css`

The authoritative auth implementation on `main` remains untouched: WordPress `wp_signon()`, nonce validation, same-page/server-derived redirect, generic failure signal, and capability/auth ownership stay intact. The candidate presentation reuses the existing `.cz-admin-station` dark-theme root plus shared `cz-tf-*` / `cz-admin-btn` foundations. New login-only tokens stay in the Admin Station token sheet; no second field/button system, persistence authority, identity, pricing, lifecycle, endpoint, or domain authority is introduced.

Builder evidence remains recorded: TypeScript clean, build successful, docs check passed. Six CSS-contract findings are pre-existing `cz-rate-sheet-tool__*` findings reproduced on unmodified `main`; no new contract failure is attributed to this candidate.

## Safeguard / next action
No source correction is requested. Do not claim visual/live acceptance before production deployment and Nath's live validation.

Per `project-work/AGENTS.md`, production/main requires Nath's separate approval. Once Nath explicitly approves production, Builder may fast-forward/push `main` to exact reviewed SHA `44c4a1b5103475d855b42c735fe16b1ff207c6a5`, record the exact resulting `main` SHA and deployment run/result, set **AWAITING LIVE VALIDATION**, and stop.

Nath then performs live validation. Reviewer audits Nath's result plus deployment evidence and either closes this work or issues the next bounded Builder correction in this same file.
