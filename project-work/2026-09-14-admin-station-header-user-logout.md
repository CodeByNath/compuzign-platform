# Admin Station Header — User Logout / Hide Apps

## Status
- **AWAITING LIVE VALIDATION**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Live validator: **Nath**
- Reviewer verdict: **Proceed**
- Production `main`: `269e1dab0d405e969fc14653e0ae3b4413a8d1bb` (fast-forwarded from `44c4a1b5`)
- Deployment: GitHub Actions "Deploy to Hostinger" run #1028, commit `269e1da` — **Success**

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

## Production/deployment evidence
- `main` fast-forwarded from `44c4a1b5` to the approved topic head `269e1dab` (plain fast-forward, no merge commit — verified independently via `git ls-remote origin main`).
- GitHub Actions "Deploy to Hostinger" run **#1028** (commit `269e1da`) completed **successfully**.

## Live validation requested — Nath
Please check on the deployed Admin Station page:
1. **Apps icon is gone** from the header's right side — no icon, no dropdown, nothing left in its place.
2. **Theme toggle** (sun/moon) still switches light/dark exactly as before.
3. **User icon dropdown** opens on click, closes on a second click, outside click, and Escape (Escape returns focus to the User icon).
4. **Log out** in that dropdown actually signs you out and lands back on the Admin Station page's own login gate — not `/wp-admin/` and not a generic WordPress login screen.

Report pass/fail (or describe any defect) back in this file or to Claude; Reviewer will audit the result plus this deployment evidence and either close the work or issue a bounded correction.
