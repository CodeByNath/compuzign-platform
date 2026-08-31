# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **CLOSED — accepted live 2026-08-31.**
- Production `main` = `57dc0fbfe4aa7c0b93568dba925b9c29dcf4ff49`.
- Deploy: **Deploy to Hostinger** run #926 (`33398154951`), exact head SHA `57dc0fbf`, completed/success, attempt 1.
- Final auditor verdict: **Proceed**.

## Accepted behavior
- Durable Request lifecycle remains authoritative/CAS-protected.
- Pending drawer: header Print beside ×; footer Cancel Request left / Approve right.
- Terminal drawer: header Print + × only.
- Print uses the stored Request snapshot through existing `QuoteProposalPreview`; no secret/transient/catalog re-resolution/repricing/security plumbing.
- Request remains hosted by the existing `AdminStationDrawer` and Drawer Kit system; no parallel drawer implementation.

## Final live acceptance
Nath reports the deployed browser pass is complete. The corrected Print control now uses Admin Station styling with no customer accent collision, and the Print / Save PDF flow remains functional.

The final source correction renamed the Admin-only icon primitive from the colliding customer-owned `.cz-icon-btn` name to `cz-station-drawer-iconbtn*`, preserving existing Admin Station tokens and interaction states.

Previously accepted live behavior remains valid: Approve/Cancel lifecycle, wall/count refresh, pending/terminal action visibility, Request list/search/drawer behavior, customer quote flow, and stored-snapshot print output.

## Branch cleanup
`review/crm-1c-request-actions` is now completed and may be deleted after verifying its tip is fully contained in `main`. Long-lived workflow remains `main` + `Project-work-instructions`; genuinely unmerged unrelated work must not be deleted.
