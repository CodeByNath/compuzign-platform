# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **AWAITING CHATGPT REVIEW — token-alignment correction applied.**
- Production `main` (unchanged) = `19c4c431d52d703e2a81e9af8dfddd8b260f439d`.
- Review head: `review/crm-1c-request-actions@bde634a9`, pushed, 1 commit over production.
- Source push: **NOT APPROVED / NOT DONE**.
- Auditor verdict on prior round: **Proceed with safeguards — one token-only visual correction (accepted below)**.

## Locked CRM-1C behavior
- Durable Request lifecycle remains authoritative/CAS-protected.
- Pending drawer: header Print icon beside existing ×; footer Cancel Request left and Approve right.
- Terminal drawer: header Print + × only; no mutation footer.
- Print renders existing `QuoteProposalPreview` from stored Request snapshot only; no customer secret, transient lookup, live re-resolution/repricing, duplicate renderer, post/meta IDs, signed URLs, or security plumbing.
- Print-window handle and bounded stylesheet behavior remain as reviewed.

## Live validation — 2026-08-31
Nath reports all functional and layout checks pass:
- Approve/Cancel lifecycle and Requests wall/count refresh;
- Pending header/footer placement with no redundant footer Close/Print;
- corrected Admin Print and print/save flow;
- terminal-state action visibility;
- existing drawer/list/search/counts and customer quote behavior.

Browser inspection confirms Print and Close currently share the neutral base values in normal state. Nath’s marked review identifies the Print icon’s interaction/accent treatment as borrowing a new/non-Admin accent colour.

## Only remaining correction
Make the header **Print / Save PDF** icon button use the established **Admin Station design tokens** for every visual state:
- default;
- hover;
- keyboard focus/focus-visible;
- active/pressed;
- disabled/busy.

Reuse the same Admin icon-button token family and interaction treatment already used by adjacent drawer-header controls (including ×) or the canonical Admin Station header icon pattern. Do not introduce or hard-code a new blue/accent colour, raw hex/RGB value, or customer-facing token. The tooltip and accessible label remain **Print / Save PDF**.

This is token alignment only. Do not change icon placement, dimensions, click target, tooltip timing/copy, print logic, window behavior, lifecycle actions, footer layout, drawer body, or other Station controls.

## Acceptance
- Print icon has no new/borrowed accent in any state and resolves through existing Admin tokens.
- Adjacent Print and × controls look intentionally part of one Admin header-action system while retaining their distinct icons.
- Focus-visible remains accessible and is not removed; it must use the canonical Admin focus token.
- Add/update focused style/contract coverage preventing raw/new colour usage for this control.
- Report changed files, tests, review SHA, and before/after browser evidence here; set **AWAITING CHATGPT REVIEW**. Do not push source to `main` without Nath’s explicit approval.

## Claude report — `bde634a9`

### Root cause
`.cz-icon-btn`'s default (`color: var(--station-text-muted)`), hover (`background: var(--station-hover-bg)`), and disabled states already used the exact same neutral tokens the adjacent `.cz-station-drawer__close` (×) uses — matching the report that normal state already looked right. But it had no `:focus-visible` or `:active` rule of its own at all, so both fell back to the browser's own default outline/highlight, which is exactly a borrowed non-Admin accent.

### Fix
- `.cz-icon-btn:focus-visible` joins the existing shared canonical selector group (`.cz-station-iconbtn:focus-visible, .cz-station-pill:focus-visible, ...`) that already carries `outline: 2px solid var(--station-focus-ring); outline-offset: 2px;` — the same rule the Admin header's own icon buttons (menu/theme/apps/user) use.
- `.cz-icon-btn:active:not(:disabled)` gets `background: var(--station-active-bg)` — the same neutral pressed-state token `.cz-station-iconbtn[aria-expanded='true']` draws from.
- No raw hex/RGB, no new token, no dimension/placement/click-target/tooltip/print-logic change. Close (×) itself untouched — it wasn't in scope this round.

### Contract coverage added
`requests-admin-station-surface-contract.ts`: extracts every `.cz-icon-btn` rule block from `admin-station.css` and asserts none contains a raw hex/rgb/hsl literal; asserts `.cz-icon-btn:focus-visible` resolves through `var(--station-focus-ring)` and `.cz-icon-btn:active` through `var(--station-active-bg)`; asserts the default color still matches `var(--station-text-muted)`.

### Evidence (from plugin root)
- `npx tsc --noEmit`, `npm run build` — clean.
- `php tests/request-status-transition.php`, `php tests/admin-requests-durable-surface.php` — pass, unaffected.
- `npm run contract:requests-admin-station-surface` (extended) — pass.
- `npm run contract:admin-station-css` — same 6 pre-existing `cz-rate-sheet-tool__*` failures as prior rounds, unrelated (nothing this round touches that area).
- `npm run docs:check` — pass. No docs changed — this is a CSS-only correction to a control already documented.
- Not run: live WordPress/browser session — no local WP/browser environment exists in this workspace, so no before/after screenshot is available from this side. The fix is verifiable by inspecting the diff directly: `.cz-icon-btn:focus-visible`/`:active` now resolve through the same tokens `.cz-station-iconbtn` (visible in the Admin Station header today) already renders with, which is the closest evidence available without a live pass.
