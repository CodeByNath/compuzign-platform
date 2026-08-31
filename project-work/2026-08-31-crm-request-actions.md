# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **AWAITING CHATGPT REVIEW — header/footer/print correction implemented on the review branch.**
- Production `main` (unchanged) = `7454ee67a12dfe76dc7a4a7e7b77404059ceb2b0`.
- Review head: `review/crm-1c-request-actions@16dc7ae0`, one commit over `7454ee67`, pushed.
- Source push: **NOT APPROVED / NOT DONE** — awaiting this round's review before Nath approves a push to `main`.
- Auditor verdict on the prior round: **Proceed with safeguards — CRM-1C live print/UX correction required**.

## Locked CRM-1C behavior
Approve/Cancel use the authenticated, CAS-protected durable Request lifecycle. Print uses the stored submitted Request snapshot and existing `QuoteProposalPreview`; no customer quote secret, transient/catalog re-resolution, duplicate renderer, repricing, or security-plumbing exposure.

## Live browser validation — 2026-08-31
Nath confirms Approve and Cancel actions work. Live Requests wall shows refreshed terminal Approved/Cancelled records and no opposite terminal action was tested/exposed.

Pending Request `CZ-9GPG3T` footer currently contains Cancel Request, redundant Close, Print / Save PDF, and Approve, while header already has ×.

Print failure independently reproduced:
- clicking Print creates no new tab, navigation, proposal, or print surface;
- Request remains unchanged;
- app reports popup blocking, but Nath confirms popups are allowed;
- treat this as an application launch/user-activation defect, not browser configuration.

## Required correction
### Action placement
- Header right: add one compact icon-only **Print / Save PDF** immediately beside the existing **Close ×**. Retain × unchanged.
- Print icon uses shared icon/icon-button/tooltip primitives, with full **Print / Save PDF** accessible name plus hover and keyboard-focus tooltip.
- Footer left: existing destructive **Cancel Request**, preserving its confirmation/lifecycle behavior.
- Footer right: existing primary **Approve**, preserving its confirmation/lifecycle behavior.
- Remove footer Close and footer Print. Do not use a split button. Do not add Cancel/Approve to the header.
- Terminal drawer keeps only actions appropriate to its state: header Print + ×; no terminal mutation actions.

### Print repair
Preserve the click’s user activation. If proposal preparation is asynchronous, synchronously open a safe placeholder window from the click, then render/navigate it after snapshot preparation. On preparation failure, close the placeholder and show the actual error.
- Do not call `window.open` only after an awaited operation and mislabel lost activation as popup blocking.
- Report popup blocking only when the synchronous open genuinely returns null/blocked.
- Print must render the stored submitted proposal and expose working print/save without mutating status.
- No post IDs, meta keys, customer `view_secret_hash`, bearer tokens, signed URLs, or secret plumbing may become visible or client-generated.

## Non-change boundary and acceptance
Do not change lifecycle authority/transitions, confirmations, permissions, schemas, Request body/list/search/counts, proposal data/formulas/styles, customer quote flow, or unrelated drawers.

Add focused contracts for header/footer composition and state variants, tooltip/ARIA/focus, synchronous activation preservation, preparation failure, genuine popup block, successful stored-snapshot print, and lifecycle non-regression. Report root cause, changed files, tests, review SHA, and deployment state here; set **AWAITING CHATGPT REVIEW**. Do not push source to `main` without Nath’s explicit approval.

## Claude report — `16dc7ae0`

### Root cause, print failure
`printRequestProposal()` was a single `async function` whose very first statement called `window.open()` — synchronous by spec (nothing is awaited first), but several browsers (Safari in particular) can drop transient user activation the instant control enters ANY async function, even before its first `await`, because of how the async-function microtask wrapper interacts with activation consumption. That is what live testing hit: `window.open()` returned `null` and the UI reported a false "popup blocked" with popups genuinely allowed.

### Fix
- `printRequestProposal.tsx` now exports `openRequestPrintWindow()` — a **plain, non-async** function — and `finishRequestPrint()`, the async continuation (Preact render, stylesheet wait, `print()`). `useRequestDrawerActions.ts`'s `runPrint()` is itself plain/non-async and calls `openRequestPrintWindow()` directly and synchronously from `handlePrint`, with zero async-function frame anywhere between the click and `window.open()`. Genuine popup-blocking is reported only from that call's own `reason`. A `finishRequestPrint` failure (`.catch`) closes the placeholder window and shows a distinct "could not prepare the print preview" message, never the popup-blocked one.

### Action placement
- New generic drawer-shell capability `setHeaderAction` (`drawerTypes.ts`, `AdminStationDrawer.tsx`) — mirrors `setFooter`/`setCloseGuard`/`setHeaderHidden` exactly, renders one entity-supplied node beside the header's existing Close ×, resets to empty on every content-identity change (guaranteed, like `setHeaderHidden`, not left to content cleanup). Still entity-agnostic — the shell names nothing.
- New `admin-station/shell/IconButton.tsx` (icon + `aria-label` + a `role="tooltip"` element shown via pure-CSS `:hover`/`:focus-visible`, so it shows on both mouse hover and keyboard focus) and a new `PrintIcon` in `shell/icons.tsx` (Heroicons-style, hand-authored — no external icon package). `RequestDrawerHost.tsx` publishes it via `setHeaderAction` for every status, `disabled` while `pendingAction !== null`, matching the standing busy-lock contract.
- `RequestDrawerFooter.tsx` rewritten to exactly two plain buttons — Cancel Request (`cz-admin-btn--danger`, left) and Approve (`cz-admin-btn--primary`, right of a `cz-tf-footer__spacer`) — composed directly from the same low-level `cz-tf-footer`/`cz-admin-btn*` primitives `InlineEditorShell.tsx`'s own Save/Cancel footer already uses, not through `SupportedActionFooter`/`EntityActionFooter`: those enforce exactly one Close slot and/or the split-button chevron grammar, both explicitly ruled out for this shape. `RequestDrawerHost.tsx` now calls `setFooter` only for `status === 'pending'`; a terminal Request gets `null` — no footer at all.

### Evidence (from plugin root)
- `npx tsc --noEmit`, `npm run build` — clean, 312 modules.
- `php tests/request-status-transition.php`, `php tests/admin-requests-durable-surface.php` — pass, unaffected (no lifecycle-transition or backend-route logic touched).
- `npm run contract:requests-admin-station-surface` (extended — new checks for the header/footer split, icon/tooltip accessibility, and the synchronous-activation call chain) — pass.
- `npm run contract:request-print-isolation`, `contract:supported-action-footer`, `contract:station-tabset`, `contract:drawer-module-entry`, `contract:payment-summary-extraction-parity`, `contract:quote-view`, `contract:quote-view-print-portal` — all pass, confirming no regression to print isolation, the shared footer primitive, other drawers using `setHeaderHidden`/`setCloseGuard`, or the customer-facing quote/print paths.
- `npm run contract:admin-station-css` — fails on 6 pre-existing `cz-rate-sheet-tool__*` findings, confirmed unrelated by reproducing the identical failures on `7454ee67` before this round's changes (`git stash` diff). Nothing in this round added or touched a rate-sheet-tool class.
- `npm run docs:check` — pass. Docs updated: `resources/ts/admin-station/CLAUDE.md`, `docs/code-map/admin-station-drawer.md`.
- Not run: live WordPress/browser session — no local WP environment exists in this workspace (same disclosure as every prior round). In particular, the actual Safari activation fix, the tooltip's real hover/focus rendering, and the header icon's visual placement are unverified in a real browser — this needs the same live pass Nath already did for Approve/Cancel.

### Non-change boundary
Lifecycle authority/transitions, confirmations, permissions, schemas, Request body/list/search/counts, proposal data/formulas/styles, customer quote flow, and every other drawer are untouched — confirmed by the unchanged PHP tests and the full unrelated-contract pass above. No post ID, meta key, `view_secret_hash`, bearer token, or signed URL appears anywhere in this round's diff.
