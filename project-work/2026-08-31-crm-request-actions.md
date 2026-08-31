# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **SOURCE PUSH APPROVED — exact review head `19c4c431` only.**
- Production `main` remains `7454ee67a12dfe76dc7a4a7e7b77404059ceb2b0` until Claude pushes.
- Review head: `review/crm-1c-request-actions@19c4c431`, exactly 2 commits ahead of production.
- Auditor verdict: **Proceed**.

## Accepted live facts
Nath confirmed Approve/Cancel work and the Requests wall/status refresh works. Print failed live before this correction. Admin Station is the CompuZign administration surface controlling platform data; WordPress/browser implementation details are runtime mechanics, not product architecture.

## Auditor review of `19c4c431`
The narrow correction is accepted.

`openIsolatedPrintDocument()` now opens the same-origin blank print window with `width=900,height=1000` only, retains the returned handle, then explicitly sets `printWindow.opener = null` before writing/rendering. A real `null` return now again means the application genuinely failed to obtain a usable window handle, so `popup-blocked` is no longer conflated with the previous `noopener`/`noreferrer` contract.

The prior unsupported Safari/async explanation was removed. The plain synchronous-open / async-finish split remains harmless and preserves the click-to-open call path.

Independent compare confirms `19c4c431` is one scoped commit over `16dc7ae0`; changed source is limited to the print-open correction/commentary and its focused contract. The accepted UI correction remains unchanged: header Print icon beside ×; pending footer Cancel left / Approve right; terminal drawers have no lifecycle footer actions.

Claude reports passing `tsc`, build, Request PHP tests, print isolation, Request Admin surface, shared footer, customer quote print portal, and docs checks. The six `cz-rate-sheet-tool__*` CSS findings remain pre-existing/unrelated.

## Claude next action
Push **exact `19c4c431` unchanged** to `main` as a fast-forward only. Do not include any other branch/work.

After push:
1. Record exact resulting `main` SHA.
2. Record Deploy to Hostinger run id/number, attempt, conclusion, and exact `head_sha`.
3. Set **AWAITING LIVE VALIDATION** and stop.

Live acceptance after deployment: verify header Print placement, pending Cancel/Approve placement, terminal action visibility, and real Print / Save PDF from the durable stored snapshot. No source correction unless live evidence requires it.
