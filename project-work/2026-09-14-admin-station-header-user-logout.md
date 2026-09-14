# Admin Station Header — User Logout / Hide Apps

## Status
- **SOURCE PUSH NOT APPROVED**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Reviewer verdict: **Proceed with safeguards**
- Production base: `44c4a1b5103475d855b42c735fe16b1ff207c6a5`
- Reviewed topic head: `99b845781c7d4861f603a635e225aeb155ff999f` (`admin-header-user-menu`)

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

## Next action
Builder: make only the two bounded source corrections above on the same `admin-header-user-menu` branch, complete stale-branch housekeeping, rerun focused validation/build, push the updated topic branch, record the new exact SHA and evidence here, set **AWAITING REVIEWER REVIEW**, and stop. Do not push `main` yet.
