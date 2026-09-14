# Admin Station Login UI/UX

## Status
- **READY FOR BUILDER**
- Builder: **Codex / Claude as assigned by Nath**
- Reviewer: **ChatGPT independent auditor**
- Verdict: **Proceed with safeguards**
- Production base: `b537ea96e426476ca5b636d6060e4821d9057bdb`

## Branch housekeeping first
`admin-ui-refinement` is fully contained in `main` and GitHub compare reports identical (ahead 0 / behind 0). Remove that completed topic branch before creating the new login topic branch so the repository returns to `main` + `Project-work-instructions` only.

Then create one topic branch for this work, e.g. `admin-login-ui`.

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
Before review, record in this file:
- exact changed files;
- topic SHA;
- source diff summary;
- focused validation/build results;
- mobile portrait and desktop screenshots;
- explicit confirmation that authentication behaviour/source was not altered except presentation markup needed for icons/footer.

Push only the topic branch, change status to **AWAITING REVIEWER REVIEW**, and stop. Do not merge to `main` or deploy without reviewer approval.
