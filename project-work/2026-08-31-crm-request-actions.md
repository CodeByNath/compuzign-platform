# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **AWAITING CHATGPT REVIEW — both required corrections applied on the review branch.**
- Production base: `main@96d5593799af4336c071f462aef445baf5872836`.
- Review head: `review/crm-1c-request-actions@7454ee67` (pushed), 4 commits ahead of production (`7c9a0fee`, `215d85a2`, `f7122035`, `7454ee67`).
- Source push to `main`: **NOT APPROVED / NOT DONE**.
- Auditor verdict on `f7122035`: **Proceed with safeguards**.

## Accepted
Approve/Cancel architecture remains accepted:
- authenticated `PATCH /admin/requests/{ref}/status`, targets only `approved|cancelled`;
- CAS-protected first-terminal-writer wins; same-target idempotent; legacy raw `new` preserved;
- shared Request footer grammar; successful mutation refreshes drawer + originating Requests wall/summary.

Payment-summary extraction in `215d85a2` remains accepted and closed absent evidence.

`f7122035` isolated Admin Print direction is architecturally sound:
- renders existing `QuoteProposalPreview` from durable `RequestEntry` snapshot only;
- no customer secret, transient lookup, catalog/API re-resolution, duplicate renderer, or global Admin style injection;
- isolated document loads code-owned `00-tokens.css`, `01-reset.css`, `02-base.css`, `cost-builder.css`;
- shared proposal/customer print contracts pass.

## Required corrections before approval
1. **Bound stylesheet waiting.** `waitForStylesheets()` currently resolves only from future `load/error` events. If an event is missed, a cached link has already completed, or the browser never fires either event, `printRequestProposal()` can await forever and never call `print()`. Make this bounded and race-safe: recognize an already-loaded stylesheet where feasible and add a short timeout fallback so Print cannot hang indefinitely. Do not make a stylesheet failure crash the Request drawer.

2. **Honor busy-state action lock.** Earlier accepted UI contract says actions disable while Approve/Cancel mutation is in flight. `RequestDrawerFooter.tsx` currently deliberately leaves Print enabled while lifecycle mutation is busy. Change Print to `disabled: busy` in pending state. Approved/cancelled Print remains normally enabled.

Add/extend focused contracts for both cases. Keep all other `f7122035` behavior unchanged.

## Claude next action
Apply only the two corrections above on `review/crm-1c-request-actions`; run focused print/footer contracts plus `tsc --noEmit`, build, Request transition tests, customer quote/print parity contracts, and docs check. Push review branch only, record exact SHA/tests, set **AWAITING CHATGPT REVIEW**, then stop.

## Claude report — `7454ee67`

### What changed
1. **`openIsolatedPrintDocument.ts` — `waitForStylesheets()` bounded/race-safe.** Now checks `link.sheet !== null` up front so an already-loaded (e.g. cached) stylesheet resolves immediately without waiting on any event. Every remaining listener races a `setTimeout` fallback (`STYLESHEET_LOAD_TIMEOUT_MS = 2000`, overridable via a second parameter); whichever settles first (`load`, `error`, or the timeout) clears the other and resolves. The function still never rejects — a stylesheet failure resolves like success, so it cannot throw into `printRequestProposal()` and crash the drawer.
2. **`RequestDrawerFooter.tsx` — Print honors the busy lock.** The pending-status Print action now carries `disabled: busy`, matching Approve/Cancel. Removed the stale comment claiming Print "stays available" during mutation. Approved/cancelled Print (the single-action shape) is unaffected — no `pendingAction` machine applies there.

### Contract coverage added
- `request-print-isolation-contract.ts`: new section 4 exercises `waitForStylesheets()` directly against `happy-dom` — a link that never fires `load`/`error` still resolves (bounded by a short overridden timeout, not the real 2s default), and a link that does fire `load` resolves promptly rather than waiting out the timeout. New source-level checks confirm `openIsolatedPrintDocument.ts` references `link.sheet` (already-loaded recognition) and pairs `setTimeout`/`clearTimeout` (bounded race).
- `requests-admin-station-surface-contract.ts`: new structural check that the pending branch's `print` action descriptor includes `disabled: busy`.

### Evidence (from plugin root)
- `npx tsc --noEmit` — clean.
- `npm run build` — clean, 311 modules, `admin-station.js` unchanged in shape (415.37 kB).
- `php tests/request-status-transition.php` — pass, unaffected (no lifecycle-transition logic touched).
- `npm run contract:request-print-isolation` (extended) — pass, including the two new stylesheet-wait checks.
- `npm run contract:requests-admin-station-surface` (extended) — pass, including the new busy-lock check.
- `npm run contract:supported-action-footer`, `contract:quote-view`, `contract:quote-view-print-portal`, `contract:payment-summary-extraction-parity` — all pass, confirming no regression to the shared footer primitive or the customer-facing quote/print paths.
- `npm run docs:check` — pass. No docs changed this round — both corrections are internal to files `resources/ts/admin-station/CLAUDE.md` already documents as CRM-1C's, no ownership/boundary shift.
- Not run: live WordPress/browser session — same disclosure as every prior round. In particular, real network timing for a slow/cached stylesheet load and the actual `disabled` visual state on the Print button are unverified in a real browser.

No architecture blocker encountered this round — both of the auditor's required corrections applied as scoped, nothing else in `f7122035` touched.
