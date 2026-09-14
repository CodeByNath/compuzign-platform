# Admin Station Header — User Logout / Hide Apps

## Status
- **CLOSED — accepted 2026-09-14**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Live validator: **Nath**
- Final verdict: **Proceed**
- Production `main`: `269e1dab0d405e969fc14653e0ae3b4413a8d1bb`
- Deployment: GitHub Actions "Deploy to Hostinger" run #1028 — **Success**

## Accepted result
Admin Station header right side now:
- keeps the existing light/dark theme toggle;
- removes the Apps icon/dropdown entirely;
- keeps the User icon;
- User dropdown contains one real **Log out** action;
- preserves existing dropdown styling, outside-click dismissal, Escape dismissal, header navigation, and WordPress auth/session ownership.

## Reviewer audit
The approved candidate was reviewed independently against production base `44c4a1b5`. Apps was removed rather than hidden; theme behavior was unchanged; logout uses WordPress `wp_logout_url()` through the existing runtime config seam; the redirect returns to the current Admin Station page; no client-side auth/session authority or new domain authority was introduced.

The review round also corrected:
- User menu `aria-labelledby` now points to the stable User trigger id;
- the fake `href="#"` logout fallback was removed;
- stale `admin-login-ui` branch housekeeping was completed.

Builder validation recorded: TypeScript clean, build successful, station-tabset contract 98 checks passed, docs check passed, and only the same six pre-existing unrelated `cz-rate-sheet-tool__*` CSS-contract findings remained.

## Production / live evidence
- `main` is the exact approved SHA `269e1dab0d405e969fc14653e0ae3b4413a8d1bb`.
- GitHub Actions deploy run #1028 completed successfully for that exact SHA.
- Nath completed live validation and explicitly reported **pass** on 2026-09-14.

The active topic `admin-header-user-menu` is now identical to `main` and is safe to delete as the final branch-housekeeping step before the next work item.

Work area closed. Do not reopen without hard evidence of a regression.
