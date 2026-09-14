# Admin Station Header — User Logout / Hide Apps

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Reviewer verdict (prior round): **Proceed with safeguards**, 3 blocking corrections
- Production base: `44c4a1b5103475d855b42c735fe16b1ff207c6a5`
- Pushed Builder topic head: `269e1dab0d405e969fc14653e0ae3b4413a8d1bb` (`admin-header-user-menu`)

## Goal
Header right side only:
- keep existing light/dark theme toggle;
- remove Apps icon/dropdown;
- keep User icon;
- User dropdown contains one real **Log out** action;
- preserve existing dropdown visual language, outside-click dismissal, Escape dismissal, navigation, and WordPress auth/session ownership.

## Reviewer audit
The topic is one commit directly ahead of production with no divergence. Actual changes are limited to Admin Station header/dropdown presentation, runtime config typing, `AssetLoader.php`, and rebuilt Admin Station assets.

The overall approach is correct: Apps is removed from `AdminStationHeader.tsx`; theme toggle is unchanged; logout uses WordPress `wp_logout_url()` rather than a client-side session reset; redirect target is derived from the current same-site request; no new auth/session authority is introduced.

## Blocking corrections
1. **Menu accessibility is wrong.** `AdminStationDropdown` renders `aria-labelledby={labelledBy}`, but the User call currently passes `labelledBy="cz-station-user-menu"` — the menu's own id. A menu cannot meaningfully label itself. Give the User trigger button a stable id (for example `cz-station-user-menu-trigger`) and pass that id as `labelledBy`. Preserve `aria-haspopup`, `aria-expanded`, `aria-controls`, Escape focus restoration, and outside-click dismissal.

2. **Do not ship a fake logout fallback.** The Log out link currently uses `href={window.CompuZignConfig?.logoutUrl ?? '#'}`. `#` is not logout and silently degrades required capability. Use the authoritative runtime URL without substituting a no-op action. If the runtime invariant must be guarded, fail/omit explicitly rather than presenting a clickable fake Log out.

3. **Branch housekeeping report is false/incomplete.** Remote branch listing still contains `admin-login-ui`, so the repo currently has four branches: `main`, `Project-work-instructions`, `admin-login-ui`, `admin-header-user-menu`. Root `AGENTS.md` allows only one active topic branch and says completed topic deletion is mandatory once contained in `main`. Verify `admin-login-ui` is an ancestor of `main`, delete the stale remote branch, and record the corrected branch set.

## Corrections applied (topic head `269e1dab`)

1. **Menu labelling fixed.** The User trigger button now has `id="cz-station-user-menu-trigger"`; `AdminStationDropdown`'s `labelledBy` for the User menu is that trigger id, not the menu's own id. `aria-haspopup`, `aria-expanded`, `aria-controls`, Escape-restores-focus, and outside-click dismissal are all unchanged.

2. **Fake logout fallback removed.** `href={window.CompuZignConfig?.logoutUrl ?? '#'}` is gone. `logoutUrl` is read once (`const logoutUrl = window.CompuZignConfig?.logoutUrl`) and the dropdown only renders — with its one real Log out action — when `userMenuOpen && logoutUrl` are both true; if the runtime config value were ever absent, the menu produces no content rather than a non-functional link.

3. **Branch housekeeping corrected.** Verified `admin-login-ui` (`44c4a1b5`) was an ancestor of `origin/main` (`git merge-base --is-ancestor`, same SHA), then deleted it from `origin` this time (it was only removed locally in the prior round — the actual gap the Reviewer caught). `git ls-remote --heads origin` now shows exactly `main`, `Project-work-instructions`, `admin-header-user-menu`.

Focused validation rerun (plugin root), all clean: `npx tsc --noEmit`, `npm run build`, `npm run contract:admin-station-css` (same 6 pre-existing unrelated `cz-rate-sheet-tool__*` findings only), `npm run contract:station-tabset` (98 checks), `npm run docs:check`.

Only files touched by this correction: `AdminStationHeader.tsx` and the rebuilt `dist/js/admin-station.js`. No other file from the prior round changed.

Topic branch pushed; `main` untouched pending `SOURCE PUSH APPROVED`.
