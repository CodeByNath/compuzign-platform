# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **AWAITING LIVE VALIDATION — source and deploy independently verified.**
- Production `main` = `57dc0fbfe4aa7c0b93568dba925b9c29dcf4ff49`.
- Deploy: **Deploy to Hostinger** run #926 (`33398154951`), exact head SHA `57dc0fbf`, completed/success, attempt 1.
- Auditor verdict: **Proceed**.

## Locked behavior
- Durable Request lifecycle remains authoritative/CAS-protected.
- Pending drawer: header Print beside ×; footer Cancel Request left / Approve right.
- Terminal drawer: header Print + × only.
- Print uses the stored Request snapshot through existing `QuoteProposalPreview`; no secret/transient/catalog re-resolution/repricing/security plumbing.

## Accepted live evidence
Nath already confirmed Approve/Cancel, wall/count refresh, Print/Save PDF, terminal action visibility, and existing Requests/customer quote behavior. The last remaining defect was visual: Print inherited the customer accent because the Admin control reused customer-owned `.cz-icon-btn`.

## Accepted source correction
The deployed correction renames that Admin-only primitive to `cz-station-drawer-iconbtn*`, preserving Admin Station tokens (`--station-text-muted`, `--station-hover-bg`, `--station-focus-ring`, `--station-active-bg`). This structurally removes the Atomic Engine class collision.

The Request drawer otherwise already uses the established system: `AdminStationDrawer`, Drawer Kit `ReadBlock`, `cz-tf-footer` / `cz-admin-btn*`, and the existing confirmation-dialog convention. No parallel/bespoke drawer system was introduced.

Independent GitHub verification confirms `main` is exact `57dc0fbf...`, parent `dabb7d34...`, and Actions run #926 deployed that exact SHA successfully.

## Branch/workflow state
Remote branches currently: `main`, `Project-work-instructions`, current `review/crm-1c-request-actions`, and genuinely-unmerged `review/quote-email-billed-item-separators`. Completed phase/recovery branches remain removed. Delete the CRM-1C review branch only after this work closes.

## Remaining live acceptance
**Browser validation IS required before closure**, but only one narrow visual pass:
1. Open a Request drawer on the deployed Admin Station.
2. Confirm Print is neutral/Admin-styled in default and hover states — no customer gold/accent.
3. Confirm keyboard focus uses the Admin focus ring and pressed state uses the Admin active treatment.
4. Confirm Print still opens the stored proposal/Print-Save flow normally.
5. No other Request/customer behavior needs to be re-tested unless this visual pass exposes a regression.

If this passes, mark CRM-1C **CLOSED**, record live acceptance, then remove `review/crm-1c-request-actions` after verifying it is fully contained in `main`.