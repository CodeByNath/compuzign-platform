# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **SOURCE PUSH APPROVED — exact review SHA `bde634a9` only.**
- Production `main` = `19c4c431d52d703e2a81e9af8dfddd8b260f439d`.
- Review head: `review/crm-1c-request-actions@bde634a9`, exactly 1 commit ahead / 0 behind production.
- Auditor verdict: **Proceed**.

## Locked CRM-1C behavior
- Durable Request lifecycle remains authoritative/CAS-protected.
- Pending drawer: header Print icon beside existing ×; footer Cancel Request left and Approve right.
- Terminal drawer: header Print + × only; no mutation footer.
- Print renders existing `QuoteProposalPreview` from stored Request snapshot only; no customer secret, transient lookup, live re-resolution/repricing, duplicate renderer, post/meta IDs, signed URLs, or security plumbing.
- Print-window handle and bounded stylesheet behavior remain as reviewed.

## Live validation already passed — 2026-08-31
Nath reports all functional/layout checks pass on the deployed CRM-1C behavior:
- Approve/Cancel lifecycle and Requests wall/count refresh;
- pending header/footer placement with no redundant footer Close/Print;
- corrected Admin Print and print/save flow;
- terminal-state action visibility;
- existing drawer/list/search/counts and customer quote behavior.

The only remaining issue found live was visual token alignment on the Print header icon interaction states.

## Auditor review of `bde634a9`
Independent compare confirms the review head is one scoped commit over production and changes only:
- `resources/ts/admin-station/styles/admin-station.css`;
- compiled `dist/css/admin-station.css`;
- focused Request Admin-surface contract.

The correction is token-only and within scope:
- `.cz-icon-btn:focus-visible` now uses existing `var(--station-focus-ring)` via the canonical Admin focus selector group;
- `.cz-icon-btn:active:not(:disabled)` uses existing `var(--station-active-bg)`;
- default/hover/disabled neutral behavior remains on existing Admin Station tokens;
- no raw/new colour, customer-facing token, size, placement, tooltip, print logic, lifecycle, footer layout, drawer body, or unrelated control change.

Claude reports passing `tsc`, build, Request PHP tests, extended Request Admin-surface contract, and docs check. The six `cz-rate-sheet-tool__*` CSS findings remain pre-existing/unrelated and are not part of this work.

## Claude next action
Push **exact `bde634a9` unchanged** to `main` as a fast-forward only. Record resulting `main` SHA and GitHub Actions Hostinger deployment evidence in this same file, then stop. Do not add any other source change.

After deployment, only a quick live visual confirmation of the Print icon focus/pressed token treatment is needed before this work can close.
