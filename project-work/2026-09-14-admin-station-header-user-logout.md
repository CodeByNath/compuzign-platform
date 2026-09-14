# Admin Station Header — User Logout / Hide Apps

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: **Claude** (assigned by Nath)
- Reviewer: **ChatGPT independent auditor**
- Verdict: **Proceed with safeguards**
- Production base: `44c4a1b5103475d855b42c735fe16b1ff207c6a5`
- Pushed Builder topic head: `99b845781c7d4861f603a635e225aeb155ff999f` (branch `admin-header-user-menu`)

## Housekeeping first
Done. Verified `admin-login-ui` was fully contained in `main` (`git merge-base --is-ancestor`, same SHA `44c4a1b5`), deleted the local branch (already deleted from `origin` in the prior cycle), then created `admin-header-user-menu` from `main`. Branch set is `main` + `Project-work-instructions` + the one active topic.

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

## Builder evidence

Changed files (topic `admin-header-user-menu` @ `99b845781c7d4861f603a635e225aeb155ff999f`):
- `src/Core/AssetLoader.php`
- `resources/ts/api/client.ts`
- `resources/ts/admin-station/shell/AdminStationHeader.tsx`
- `resources/ts/admin-station/shell/AdminStationDropdown.tsx`
- `resources/ts/admin-station/styles/admin-station.css`
- `dist/css/admin-station.css`, `dist/js/admin-station.js` (rebuilt)

Logout URL/action: `AssetLoader::outputRuntimeConfig()` adds `logoutUrl` to the existing global `window.CompuZignConfig` seam — `esc_url_raw(wp_logout_url(esc_url_raw(home_url(wp_unslash($_SERVER['REQUEST_URI'])))))`. `wp_logout_url()` is WordPress core; it signs the URL with its own `'log-out'` nonce action, so visiting it validates that nonce server-side before calling `wp_logout()` — no bespoke nonce/session code was written. The header's User dropdown renders `<a href={window.CompuZignConfig.logoutUrl}>Log out</a>`, a plain link — no client-side logout logic exists.

Redirect target: the URL passed to `wp_logout_url()` is the current request URL (`home_url(REQUEST_URI)`), the exact same server-derived, non-admin destination pattern `AdminStationAuth::currentRequestUrl()` already uses for its own post-login redirect (never a hardcoded slug, never `/wp-admin/`). Since `outputRuntimeConfig()` runs on `wp_enqueue_scripts` for whatever page rendered the Admin Station shortcode, "current request URL" ⇒ the Admin Station page itself, so a completed logout lands back on it — which, once the session is gone, renders the login gate per `AdminStationModule::renderShortcode()`'s existing `is_user_logged_in()` branch. Nothing new was added to make that happen; it's the same routing that already exists today.

Focused validation/build (from plugin root):
- `npx tsc --noEmit` — clean.
- `npm run build` — succeeded.
- `npm run contract:admin-station-css` — passes for everything this change touched; the same 6 pre-existing `cz-rate-sheet-tool__*` findings remain (confirmed present on unmodified `main`, unrelated, out of scope).
- `npm run contract:station-tabset` — 98 checks passed (unaffected, run since the header sits in the same shell tree).
- `npm run docs:check` — passed, 119 Markdown files / 48 Code Maps; no Code Map referenced the Apps control or empty-dropdown behaviour, so none needed updating.

Apps control: the button, its dropdown render branch, its refs, and its `DropdownId` union member are deleted from `AdminStationHeader.tsx` entirely — not CSS-hidden. `AppsIcon` import was dropped from this file only (it's still used, and left untouched, in `RateSheetTool.tsx`). `AdminStationDropdown.tsx`'s doc comment previously asserted it is "intentionally empty" with no rows/actions/content; that invariant is gone now that the User dropdown has content, so the comment and the component (now takes `children`) were both updated to match — the surface itself (positioning/open-close/token styling) is otherwise unchanged, and its placeholder `min-height: 96px` (sized for the old empty state) was removed since content now determines height.

Theme toggle: byte-identical — same button, same `useAdminStation()` `theme`/`toggleTheme`, same icon-swap logic, not touched.

Push only the topic branch is done; `main` will not be touched until Reviewer sets `SOURCE PUSH APPROVED`.
