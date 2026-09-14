# Admin Station Header — User Logout / Hide Apps

## Status
- **READY FOR BUILDER**
- Builder: **Claude / Codex as assigned by Nath**
- Reviewer: **ChatGPT independent auditor**
- Verdict: **Proceed with safeguards**
- Production base: `44c4a1b5103475d855b42c735fe16b1ff207c6a5`

## Housekeeping first
The completed `admin-login-ui` topic is now fully contained in `main` at the same SHA and is safe to remove. Delete the stale topic branch before creating the new one so the branch set returns to `main` + `Project-work-instructions` + one active topic.

Create one topic branch for this work, e.g. `admin-header-user-menu`.

## Goal
Refine the Admin Station header right-side controls only.

Current header has:
- theme toggle;
- Apps icon with an empty dark dropdown;
- User icon with an empty dark dropdown.

Required result:
- keep the existing light/dark theme toggle exactly as a direct header control;
- hide/remove the Apps icon and its empty dropdown from the visible header;
- keep the User icon;
- make the User dropdown useful by adding a single **Log out** action;
- preserve the existing dark dropdown visual language and outside-click / Escape dismissal behaviour.

## Logout behaviour
Use the existing WordPress authentication/session authority. Do not invent a client-only logout mechanism, custom session store, new auth endpoint, or account system.

Builder must first audit how frontend runtime data is currently exposed to Admin Station and choose the smallest authoritative WordPress logout path. Prefer a server-generated, nonce-protected WordPress logout URL (e.g. `wp_logout_url(...)`) exposed through the existing asset/runtime config seam if one exists. After logout, return to the current Admin Station page/login gate rather than `/wp-admin/` or a hardcoded admin slug.

## Must preserve
- existing header station navigation and menu button;
- theme toggle behaviour and persistence;
- Admin Station dropdown component/style system;
- one-active-dropdown semantics where still relevant;
- outside-click and Escape dismissal;
- accessibility semantics for the User menu and Log out action;
- WordPress auth/session ownership;
- no unrelated header, navigation, identity, persistence, pricing, or Station lifecycle changes.

## Reviewer audit note
Current `AdminStationHeader.tsx` explicitly owns `[theme][apps][user]`; Apps and User both open empty `AdminStationDropdown`s. This is presentation chrome, so the change belongs in Admin Station shell/runtime config, not in a domain Station. The auth system already uses WordPress sessions, so logout must follow WordPress authority rather than a frontend state reset.

## Builder evidence required
Record in this file:
- exact changed files;
- exact topic SHA;
- how the logout URL/action is produced and why it is nonce-protected;
- confirmation logout returns to the current Admin Station/login gate and not `/wp-admin/`;
- focused type/build/contracts/docs results;
- confirmation Apps control is removed/hidden without leaving dead empty-dropdown state;
- confirmation theme toggle is unchanged.

Push only the topic branch, set **AWAITING REVIEWER REVIEW**, and stop. Do not push `main` until Reviewer sets `SOURCE PUSH APPROVED`.
