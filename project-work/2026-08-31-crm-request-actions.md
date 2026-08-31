# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **AWAITING CHATGPT REVIEW — narrow noopener/noreferrer correction applied.**
- Production `main` remains `7454ee67a12dfe76dc7a4a7e7b77404059ceb2b0`.
- Review head: `review/crm-1c-request-actions@19c4c431`, pushed, 2 commits ahead of production.
- Source push: **NOT APPROVED / NOT DONE**.
- Auditor verdict on `16dc7ae0`: **Proceed with safeguards — narrow correction required (accepted below)**.

## Live facts already accepted
Nath confirmed Approve/Cancel work and Request wall/status refresh works. Print still fails live. Admin Station is the CompuZign administration surface that controls platform data; do not reduce this defect to a generic Safari/browser-settings issue or confuse WordPress hosting mechanics with product architecture.

## Audit finding on `16dc7ae0`
The async-function explanation is not credible and must not be documented as root cause. An `async` function executes synchronously until its first `await`; the original code called `window.open()` before any await.

More importantly, `openIsolatedPrintDocument()` still calls:
`window.open('', '_blank', 'noopener,noreferrer,width=900,height=1000')`
and then treats a `null` return as popup blocking.

That contract is internally inconsistent: `noopener` in `windowFeatures` deliberately severs the opener relationship and browser implementations/spec guidance allow `window.open()` to return `null`; `noreferrer` also implies `noopener`. Therefore a successfully-created browsing context can be misclassified as “popup blocked.” The synchronous/non-async split in `16dc7ae0` does not remove this condition.

## Claude next action — narrow only
1. Correct `openIsolatedPrintDocument()` so the application can retain the same-origin blank window handle it needs to write/render/print. Do **not** pass `noopener`/`noreferrer` while expecting a usable returned handle.
2. After a usable blank window is obtained, detach `printWindow.opener = null` where supported before rendering. The print document never navigates to an untrusted origin; keep it code-owned and same-origin.
3. Genuine popup-blocking remains only `window.open(...) === null` under the corrected feature contract.
4. Remove the unsupported Safari/async root-cause commentary from source/docs. Record the actual defect: incompatible `noopener/noreferrer` return-handle contract.
5. Preserve the accepted UI correction: header Print icon beside ×; pending footer Cancel left / Approve right; terminal no footer mutation actions.
6. Extend the focused print contract to assert the window feature string no longer requests `noopener`/`noreferrer`, the returned handle is used, opener is detached after success, null still maps to genuine popup block, and stored-snapshot/no-secret/no-repricing invariants remain.
7. Run focused Request/print/customer parity suites, push review branch only, set **AWAITING CHATGPT REVIEW**, stop.

No lifecycle, schema, permissions, Request body/list/count, proposal formulas/styles, customer quote flow, or unrelated drawer changes.

## Claude report — `19c4c431`

Accepted the audit's correction in full — my prior Safari/async-activation explanation was wrong, and the `noopener`/`noreferrer` diagnosis is correct and verified against spec: passing either in `window.open()`'s feature string makes it return `null` on a genuinely successful open, precisely because withholding the caller's handle is what `noopener` is for.

### What changed
1. `openIsolatedPrintDocument.ts`: `win.open('', '_blank', 'width=900,height=1000')` — `noopener`/`noreferrer` dropped. Once a real handle exists, `printWindow.opener = null` is set explicitly (try/catch — non-fatal if some engine makes it non-configurable), keeping the same defense-in-depth without losing the handle this code needs to render/print into.
2. Corrected the false root-cause commentary in `printRequestProposal.tsx`, `useRequestDrawerActions.ts`, and `admin-station/CLAUDE.md` — all now name the actual defect. The plain-sync-open/async-continuation split from `16dc7ae0` is kept (harmless, still reasonable) but no longer credited as the fix.
3. `request-print-isolation-contract.ts` extended: the fake `win.open()` now records its call args and asserts the feature string never contains `noopener`/`noreferrer`; asserts `result.printWindow.opener === null` after a successful open; added source-level checks for both (no `noopener`/`noreferrer` in the `win.open(...)` call, `.opener = null` present). Existing checks already prove the returned handle is the one used (mount/links/title all read through it) and that `null` still maps to `popup-blocked`.
4. UI correction from the prior round (header Print icon beside ×, footer Cancel left / Approve right, terminal drawer with no mutation actions) is unchanged this round — not touched.

### Evidence (from plugin root)
- `npx tsc --noEmit`, `npm run build` — clean.
- `php tests/request-status-transition.php`, `php tests/admin-requests-durable-surface.php` — pass, unaffected.
- `npm run contract:request-print-isolation` (extended) — pass, including the new noopener/opener checks.
- `npm run contract:requests-admin-station-surface`, `contract:supported-action-footer`, `contract:quote-view-print-portal` — pass, no regression to the header/footer split or customer print portal.
- `npm run contract:admin-station-css` — same 6 pre-existing `cz-rate-sheet-tool__*` failures as `7454ee67`, confirmed unrelated (nothing this round touches that area).
- `npm run docs:check` — pass.
- Not run: live WordPress/browser session — no local WP environment exists here. This defect was only ever reproducible live; the actual fix needs the same live pass Nath did for Approve/Cancel before this can close.