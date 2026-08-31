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
Use the standard drawer header action area. On the right of the Request title, render three compact icon-only actions:
1. **Print / Save PDF**
2. **Cancel Request**
3. **Close (×)**

Exact visual order may follow the shared header-action convention, but Close remains the terminal/rightmost action. Each icon button must:
- use an existing shared icon and icon-button primitive;
- show its full action label on mouse hover and keyboard focus using the established tooltip;
- have the same full accessible name/ARIA label;
- preserve visible focus, touch target, disabled, busy, and contrast standards.

Footer behavior:
- remove footer **Close**, footer **Cancel Request**, and standalone footer **Print / Save PDF**;
- keep **Approve** as the sole primary footer action for a Pending Request;
- do not combine Approve and Print into a split button (this supersedes the earlier split-button direction).

## Action semantics
- Header Close retains existing ×, Escape, and backdrop behavior.
- Header Cancel remains destructive and must preserve the existing confirmation, permissions, loading, success/failure, and lifecycle transition. An icon-only presentation must not weaken its warning/confirmation.
- Header Print is non-mutating and opens the existing authorized customer quote/print surface.

## Print repair
If the signed URL resolves asynchronously, preserve the originating click’s user activation: synchronously open a safe placeholder destination, then navigate it after the authorized URL resolves. Close the placeholder and show the real error when resolution fails.
- Do not defer `window.open` until after an awaited request and mislabel lost activation as popup blocking.
- Report “popup blocked” only when a synchronous open genuinely returns blocked/null.
- The opened quote must expose enabled **Print / Save as PDF**.
- Never expose post IDs, meta keys, `view_secret_hash`, bearer tokens, signed URLs, or secret plumbing in visible UI/log/toast copy. Do not manufacture secrets client-side.

## Hard non-change boundary
Do not change Request states, Approve/Cancel semantics or confirmations, permissions, schema/persistence, quote pricing/content/rendering, drawer body, other drawers, or unrelated Station actions. Print must not mutate or close the Request.

## Acceptance
- Pending drawer header has accessible icon-only Print, Cancel, and Close actions with hover/focus tooltips.
- Pending footer contains only Approve.
- Approve and Cancel confirmation/lifecycle paths remain unchanged.
- Print reliably opens the authorized print-capable quote when popups are allowed.
- Async success, URL failure, genuine popup block, and navigation failure have distinct tested outcomes/messages.
- Approved/cancelled/non-printable states show only appropriate actions.
- Add focused contracts for header composition/order, labels/tooltips, keyboard/focus, user-activation preservation, print outcomes, and lifecycle non-regression.
- Report root cause, changed files, tests, review SHA, and browser evidence here; set **AWAITING CHATGPT REVIEW**. Do not push source to `main` without Nath’s explicit approval.
