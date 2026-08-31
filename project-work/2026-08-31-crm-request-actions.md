# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **READY FOR CLAUDE**
- Production `main` = `7454ee67a12dfe76dc7a4a7e7b77404059ceb2b0`.
- Deploy run `33371342766` / #923 = `completed/success`, exact `head_sha=7454ee67a12dfe76dc7a4a7e7b77404059ceb2b0`.
- Source push: **NOT APPROVED**
- Auditor verdict: **Proceed with safeguards — CRM-1C live print/UX correction required**.

## Locked CRM-1C behavior
Approve/Cancel use the authenticated, CAS-protected durable Request lifecycle. Print uses the stored submitted Request snapshot and existing `QuoteProposalPreview`; no customer quote secret, transient/catalog re-resolution, duplicate renderer, repricing, or security-plumbing exposure.

## Live browser validation — 2026-08-31
Nath confirms Approve and Cancel actions work. Live Requests wall shows refreshed terminal Approved/Cancelled records and no opposite terminal action was tested/exposed.

Pending Request `CZ-9GPG3T` footer currently contains Cancel Request, redundant Close, Print / Save PDF, and Approve, while header already has ×.

Print failure independently reproduced:
- clicking Print creates no new tab, navigation, proposal, or print surface;
- Request remains unchanged;
- app reports popup blocking, but Nath confirms popups are allowed;
- treat this as an application launch/user-activation defect, not browser configuration.

## Required correction
### Action placement
- Header right: add one compact icon-only **Print / Save PDF** immediately beside the existing **Close ×**. Retain × unchanged.
- Print icon uses shared icon/icon-button/tooltip primitives, with full **Print / Save PDF** accessible name plus hover and keyboard-focus tooltip.
- Footer left: existing destructive **Cancel Request**, preserving its confirmation/lifecycle behavior.
- Footer right: existing primary **Approve**, preserving its confirmation/lifecycle behavior.
- Remove footer Close and footer Print. Do not use a split button. Do not add Cancel/Approve to the header.
- Terminal drawer keeps only actions appropriate to its state: header Print + ×; no terminal mutation actions.

### Print repair
Preserve the click’s user activation. If proposal preparation is asynchronous, synchronously open a safe placeholder window from the click, then render/navigate it after snapshot preparation. On preparation failure, close the placeholder and show the actual error.
- Do not call `window.open` only after an awaited operation and mislabel lost activation as popup blocking.
- Report popup blocking only when the synchronous open genuinely returns null/blocked.
- Print must render the stored submitted proposal and expose working print/save without mutating status.
- No post IDs, meta keys, customer `view_secret_hash`, bearer tokens, signed URLs, or secret plumbing may become visible or client-generated.

## Non-change boundary and acceptance
Do not change lifecycle authority/transitions, confirmations, permissions, schemas, Request body/list/search/counts, proposal data/formulas/styles, customer quote flow, or unrelated drawers.

Add focused contracts for header/footer composition and state variants, tooltip/ARIA/focus, synchronous activation preservation, preparation failure, genuine popup block, successful stored-snapshot print, and lifecycle non-regression. Report root cause, changed files, tests, review SHA, and deployment state here; set **AWAITING CHATGPT REVIEW**. Do not push source to `main` without Nath’s explicit approval.
