# Admin Station Header — User Logout / Hide Apps

## Status
- **SOURCE PUSH APPROVED**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Reviewer verdict: **Proceed**
- Production base: `44c4a1b5103475d855b42c735fe16b1ff207c6a5`
- Approved topic head: `269e1dab0d405e969fc14653e0ae3b4413a8d1bb` (`admin-header-user-menu`)

## Goal
Header right side only:
- keep existing light/dark theme toggle;
- remove Apps icon/dropdown;
- keep User icon;
- User dropdown contains one real **Log out** action;
- preserve existing dropdown visual language, outside-click dismissal, Escape dismissal, navigation, and WordPress auth/session ownership.

## Reviewer audit
Fresh branch check now shows exactly the allowed three branches: `main`, `Project-work-instructions`, and active topic `admin-header-user-menu`; stale `admin-login-ui` is gone.

The reviewed topic is two commits directly ahead of production base with no divergence. The second commit contains only the requested corrections in `AdminStationHeader.tsx` plus rebuilt `dist/js/admin-station.js`.

All prior blockers are resolved:
1. User trigger now has stable id `cz-station-user-menu-trigger`; the dropdown `aria-labelledby` points to that trigger. Existing `aria-haspopup`, `aria-expanded`, `aria-controls`, Escape focus restoration, and outside-click dismissal remain intact.
2. Fake `href="#"` logout fallback is removed. The real WordPress logout action renders only when server-provided `logoutUrl` exists.
3. Stale `admin-login-ui` remote branch has been removed; branch hygiene now matches repository rules.

The underlying approach remains sound: Apps is removed rather than merely hidden; theme toggle is unchanged; logout uses WordPress `wp_logout_url()` through the existing runtime-config seam; redirect remains the current same-site Admin Station page; no client-side auth/session mechanism or new domain authority is introduced.

Builder validation recorded: TypeScript clean, build successful, station-tabset contract 98 checks passed, docs check passed, and only the same six pre-existing unrelated `cz-rate-sheet-tool__*` CSS-contract findings remain.

## Next action
Reviewer approval is complete for exact SHA `269e1dab0d405e969fc14653e0ae3b4413a8d1bb`.

Builder may now move only this exact reviewed candidate to `main` and let the normal GitHub Actions deployment run. Any source change invalidates this approval and requires another Reviewer pass.

After deployment, Builder must record the exact resulting `main` SHA and deployment run/result, set **AWAITING LIVE VALIDATION**, add a concise request for Nath to validate: Apps icon absent; theme toggle still works; User dropdown opens/closes correctly; Log out signs out and returns to the Admin Station login gate. Then stop.
