# Request drawer action footer and working print

## Status
- **READY FOR CLAUDE**
- Source push: **NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**

## Objective
Simplify the Admin Station Request drawer footer and repair the non-working **Print / Save PDF** action. This is a new follow-up after closed CRM-1B; do not reopen or broaden CRM-1B.

## Live browser evidence — 2026-08-31
Request `CZ-9GPG3T` (Pending) currently shows:
- header × close control;
- **Cancel Request** split action;
- separate footer **Close**;
- **Print / Save PDF** plus a disabled split chevron;
- separate **Approve**.

The footer is crowded and duplicates Close. Read-only browser reproduction:
1. Open Requests > first Pending Request.
2. Click **Print / Save PDF**.
3. Result: no new tab, navigation, print/quote surface, success/error feedback, or state change; drawer remains open. This is a silent no-op.
4. Cancel and Approve were not triggered during validation.

## Required UX
- Remove/hide the footer **Close** button. The existing header × remains the drawer-close affordance; preserve Escape/backdrop behavior.
- Keep **Cancel Request** as its existing destructive split action and preserve its lifecycle/confirmation behavior.
- Replace separate **Print / Save PDF** and **Approve** controls with one standard Station split button:
  - primary/main action: **Approve**;
  - chevron menu action: **Print / Save PDF**.
- Follow the existing Station split-button component, sizing, spacing, keyboard, focus, menu, and disabled/loading conventions. Do not create a one-off control.

## Print behavior
- **Print / Save PDF** is non-mutating and must no longer silently no-op.
- Use the existing authorized server-provided customer quote/print route for this Request. On activation, open a usable quote print surface (new tab/window if that is the established behavior) where **Print / Save as PDF** is available and enabled.
- If the browser blocks opening, show actionable failure feedback rather than doing nothing.
- Never expose raw post IDs, meta keys, `view_secret_hash`, bearer tokens, or signed URL plumbing in visible UI, logs, toast copy, or client-generated URLs.
- Do not manufacture/reconstruct secrets client-side.

## Hard non-change boundary
Do not change Request lifecycle states, Cancel/Approve semantics, confirmations, permissions, request payload/schema/persistence, quote pricing/content, customer quote rendering, other drawer sections, or unrelated Station footers. Do not auto-approve before printing or close the drawer as a side effect of print.

## Acceptance
- Pending Request footer contains header ×, Cancel split, and one Approve split; no footer Close or standalone Print control.
- Main Approve path remains unchanged and requires its existing confirmation.
- Split menu Print action opens a usable print-capable customer quote and does not mutate status.
- Popup/failure path gives visible feedback.
- Approved/cancelled/non-printable Request states retain correct action availability.
- Add focused contracts for composition, keyboard/menu behavior, print success/failure, and lifecycle non-regression.
- Report root cause, changed files, tests, review SHA, and browser evidence here; set **AWAITING CHATGPT REVIEW**. Do not push source to `main` without Nath’s explicit approval.
