# Request drawer action footer and working print

## Status
- **READY FOR CLAUDE**
- Source push: **NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**

## Objective
Simplify the Admin Station Request drawer footer and repair **Print / Save PDF**. This is a new follow-up after closed CRM-1B; do not reopen or broaden CRM-1B.

## Live browser evidence — 2026-08-31
Pending Request `CZ-9GPG3T` shows header ×, Cancel split, footer Close, standalone Print split, and separate Approve. The footer is crowded and duplicates Close.

Browser reproduction:
1. Open Requests > first Pending Request.
2. Click **Print / Save PDF**.
3. No new tab, navigation, print/quote surface, or status change; drawer remains open.
4. The application reports that the browser blocked the popup, but Nath confirms popups are not blocked. Treat that message as a false diagnosis, not a browser-setting problem.
5. Cancel and Approve were not triggered.

## Required UX
- Remove the footer **Close** button; retain header × plus existing Escape/backdrop closing.
- Preserve **Cancel Request** as its destructive split action with existing lifecycle/confirmation behavior.
- Replace standalone Print and Approve with one standard Station split button:
  - main action: **Approve**;
  - chevron menu action: **Print / Save PDF**.
- Reuse established Station split-button sizing, focus, keyboard, menu, disabled, and loading behavior.

## Print behavior
- Print is non-mutating and must open the existing authorized customer quote/print surface.
- Diagnose the actual launch sequence. If the signed URL is obtained asynchronously, preserve the originating click’s user activation: open a safe blank/placeholder destination synchronously during the click, then navigate it only after the authorized URL resolves. If URL resolution fails, close the placeholder and show the real failure.
- Do not call `window.open` only after an awaited request and then mislabel a lost user-activation failure as browser popup blocking.
- Report “popup blocked” only when a synchronous open genuinely returns a blocked/null result. Otherwise show accurate request/URL/navigation failure feedback.
- The resulting quote surface must expose an enabled **Print / Save as PDF** control.
- Never expose post IDs, meta keys, `view_secret_hash`, bearer tokens, signed URLs, or secret plumbing in visible UI/log/toast copy. Do not manufacture secrets client-side.

## Hard non-change boundary
Do not change Request lifecycle states, Cancel/Approve semantics, confirmations, permissions, schema/persistence, quote pricing/content/rendering, other drawer sections, or unrelated Station footers. Print must not approve, mutate status, or close the drawer.

## Acceptance
- Pending footer: header ×, Cancel split, and one Approve split; no footer Close or standalone Print.
- Approve path/confirmation remains unchanged.
- Print menu action reliably opens the authorized print-capable quote when popups are allowed.
- Async URL success, URL failure, genuine popup block, and navigation failure have distinct tested outcomes/messages.
- Print never mutates lifecycle state; Approved/cancelled/non-printable states retain correct actions.
- Add focused contracts for composition, keyboard/menu, synchronous user-activation preservation, success/failure, and lifecycle non-regression.
- Report root cause, changed files, tests, review SHA, and browser evidence here; set **AWAITING CHATGPT REVIEW**. Do not push source to `main` without Nath’s explicit approval.
