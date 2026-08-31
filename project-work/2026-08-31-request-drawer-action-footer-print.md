# Request drawer action footer and working print

## Status
- **READY FOR CLAUDE**
- Source push: **NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**

## Objective
Simplify the Admin Station Request drawer actions and repair **Print / Save PDF**. This is a new follow-up after closed CRM-1B; do not reopen or broaden CRM-1B.

## Live browser evidence — 2026-08-31
Pending Request `CZ-9GPG3T` currently shows header × plus footer Cancel split, Close, standalone Print split, and Approve. The footer is crowded and duplicates Close.

Print reproduction:
1. Open Requests > first Pending Request.
2. Click **Print / Save PDF**.
3. No new tab, navigation, print/quote surface, or status change; drawer remains open.
4. The app reports popup blocking, but Nath confirms popups are allowed. Treat this as a false diagnosis.
5. Cancel and Approve were not triggered.

## Required action layout
Header, right-aligned:
- add one compact icon-only **Print / Save PDF** action immediately beside the existing **Close (×)**;
- retain the existing × unchanged;
- do not add Cancel or Approve to the header.

The Print/PDF icon must use existing shared icon/icon-button primitives, show **Print / Save PDF** on mouse hover and keyboard focus using the established tooltip, have the same accessible name/ARIA label, and preserve focus, touch target, disabled, busy, and contrast standards.

Footer:
- left: **Cancel Request** using its established destructive action presentation;
- right: **Approve** using its established primary action presentation;
- remove footer **Close** and standalone footer **Print / Save PDF**;
- do not combine actions into a split button.

## Action semantics
- Header Close retains existing ×, Escape, and backdrop behavior.
- Footer Cancel remains destructive and preserves existing confirmation, permissions, loading, success/failure, and lifecycle transition.
- Footer Approve preserves existing confirmation, permissions, loading, success/failure, and lifecycle transition.
- Header Print is non-mutating and opens the existing authorized customer quote/print surface.

## Print repair
If the signed URL resolves asynchronously, preserve the click’s user activation: synchronously open a safe placeholder destination, then navigate it after the authorized URL resolves. Close the placeholder and show the real error when resolution fails.
- Do not defer `window.open` until after an awaited request and mislabel lost activation as popup blocking.
- Report “popup blocked” only when a synchronous open genuinely returns blocked/null.
- The opened quote must expose enabled **Print / Save as PDF**.
- Never expose post IDs, meta keys, `view_secret_hash`, bearer tokens, signed URLs, or secret plumbing in visible UI/log/toast copy. Do not manufacture secrets client-side.

## Hard non-change boundary
Do not change Request states, Approve/Cancel semantics or confirmations, permissions, schema/persistence, quote pricing/content/rendering, drawer body, other drawers, or unrelated Station actions. Print must not mutate or close the Request.

## Acceptance
- Pending header contains the existing × and one accessible Print/PDF icon with hover/focus tooltip.
- Pending footer contains Cancel Request aligned left and Approve aligned right; no footer Close or Print.
- Approve and Cancel paths remain unchanged.
- Print reliably opens the authorized print-capable quote when popups are allowed.
- Async success, URL failure, genuine popup block, and navigation failure have distinct tested outcomes/messages.
- Approved/cancelled/non-printable states show only appropriate actions.
- Add focused contracts for header/footer composition, alignment, labels/tooltips, keyboard/focus, user-activation preservation, print outcomes, and lifecycle non-regression.
- Report root cause, changed files, tests, review SHA, and browser evidence here; set **AWAITING CHATGPT REVIEW**. Do not push source to `main` without Nath’s explicit approval.
