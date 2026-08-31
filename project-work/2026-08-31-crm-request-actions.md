# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **AWAITING LIVE VALIDATION — pushed to `main`, deploy succeeded.**
- `main` now at `bde634a9de0766149e21dcb041a509840c0e27ae` — exact approved head, pushed as a plain fast-forward, nothing else touched.
- GitHub Actions: **Deploy to Hostinger**, run #925 (`33386405519`), event `push`, head SHA `bde634a9`, conclusion **success**.
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

## Claude report — pushed to `main`

`review/crm-1c-request-actions@bde634a9` pushed to `main` as a plain fast-forward (`git push origin review/crm-1c-request-actions:main`), `main@19c4c431` → `main@bde634a9`, no rewrite, nothing beyond the approved 1 commit.

GitHub Actions **Deploy to Hostinger** fired on that push: run #925, id `33386405519`, head SHA `bde634a9`, status `completed`, conclusion **success**.

## Claude next action
None from this side. Remaining step is Nath's quick live visual confirmation of the Print icon's focus/pressed token treatment on the deployed site — no source change expected unless that finds something.
