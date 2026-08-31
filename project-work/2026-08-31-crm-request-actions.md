# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **SOURCE PUSH APPROVED — exact review SHA `f3ded9aa` only.**
- Production `main` = `bde634a9de0766149e21dcb041a509840c0e27ae`.
- Review head `review/crm-1c-request-actions@f3ded9aa` is exactly 1 commit ahead / 0 behind production.
- Auditor verdict: **Proceed**.

## Locked behavior
- Durable Request lifecycle remains authoritative/CAS-protected.
- Pending drawer: header Print beside ×; footer Cancel Request left / Approve right.
- Terminal drawer: header Print + × only.
- Print uses the stored Request snapshot through existing `QuoteProposalPreview`; no secret/transient/catalog re-resolution/repricing/security plumbing.

## Live evidence already accepted
Nath already confirmed Approve/Cancel, wall/count refresh, Print/Save PDF, terminal action visibility, and existing Requests/customer quote behavior. The remaining live defect was the Print control visually inheriting customer styling.

## Independent audit of `f3ded9aa`
The actual defect was a CSS namespace collision: the new Admin control used `.cz-icon-btn`, while customer `atomic-engine/css/04-buttons.css` already owns the same class and applies customer accent rules. Renaming the Admin control to `cz-station-drawer-iconbtn*` removes that collision structurally while retaining Admin tokens (`--station-text-muted`, `--station-hover-bg`, `--station-focus-ring`, `--station-active-bg`).

Independent diff is scoped to the Admin icon primitive/CSS, generated assets, focused contract, and local Admin instruction. No Request lifecycle, API, print data, drawer body, pricing, identity, quote snapshot, or customer quote change.

The broader drawer concern was also checked against source: Request is hosted by the existing generic `AdminStationDrawer`; body uses shared Drawer Kit `ReadBlock`; footer uses the established `cz-tf-footer` / `cz-admin-btn*` vocabulary; dialogs reuse the established confirm convention. No second/bespoke drawer system is present, so a broad restyle would create duplication rather than fix architecture.

Claude reports `tsc`, build, Request PHP tests, Request Admin-surface contract, and docs check passing; the six existing rate-sheet CSS findings remain unrelated.

## Branch/workflow cleanup
Remote branch inventory independently confirmed: `main`, `Project-work-instructions`, `review/crm-1c-request-actions`, and genuinely-unmerged `review/quote-email-billed-item-separators`. Completed phase/review and recovery branches are gone. Long-lived workflow remains `main` + one `Project-work-instructions` coordination branch; work continues through the same `project-work/*.md` documents. Temporary review branches must be deleted when their work closes.

## Claude next action
Fast-forward **exact `f3ded9aa` unchanged** to `main`, record exact `main` SHA and Hostinger deploy run here, then stop for one final live visual check of the Print control. Do not add another source change.