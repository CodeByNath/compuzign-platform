# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **AWAITING LIVE VALIDATION**.
- Production `main` = `19c4c431d52d703e2a81e9af8dfddd8b260f439d`.
- Deploy run `33383746980` / #924 = `completed/success`, attempt 1, exact `head_sha=19c4c431d52d703e2a81e9af8dfddd8b260f439d`.
- Auditor verdict: **Proceed**.

## Accepted live facts
Nath already confirmed Approve/Cancel work and Requests wall/status refresh works. The remaining live check is the corrected Admin Print path plus final action placement/terminal-state visibility.

## Accepted CRM-1C implementation
- Durable Request lifecycle remains authoritative and CAS-protected; no transient/list-side authority.
- Pending drawer: header **Print / Save PDF** icon beside existing ×; footer **Cancel Request** left and **Approve** right.
- Terminal drawer: header Print + × only; no opposite terminal mutation action.
- Print renders existing `QuoteProposalPreview` from the stored submitted Request snapshot only; no customer secret, transient lookup, catalog/API re-resolution, duplicate renderer, repricing, post IDs, meta keys, signed URLs, or security plumbing.
- Isolated print document loads only the required code-owned proposal styles.
- `window.open()` no longer requests `noopener`/`noreferrer` while expecting a usable returned handle; after successful same-origin blank-window creation, `printWindow.opener = null` is applied best-effort.
- Stylesheet waiting remains bounded/race-safe.

## Independent production/deploy audit — current cycle
Auditor independently fetched `main` and confirmed it is exactly `19c4c431d52d703e2a81e9af8dfddd8b260f439d`; no later product-source commit is present.

Auditor independently fetched GitHub Actions run `33383746980` and confirmed **Deploy to Hostinger** run #924 completed successfully on attempt 1 for the exact same SHA.

## Live acceptance required before closure
1. Open a pending Request in the deployed CompuZign Admin Station.
2. Confirm header Print icon sits beside ×; footer has Cancel left / Approve right, with no footer Close or footer Print.
3. Click Print / Save PDF and confirm the stored submitted proposal opens and the browser print/save surface works without changing Request status.
4. Confirm an Approved/Cancelled Request shows header Print + × only and no lifecycle mutation footer.
5. Confirm existing Request drawer/list/search/counts and customer quote behavior remain otherwise unchanged.

No source correction requested. Close only after the live pass succeeds.
