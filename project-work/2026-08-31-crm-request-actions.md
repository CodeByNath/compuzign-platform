# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **READY FOR CLAUDE — current print root-cause claim is rejected; one narrow correction required.**
- Production `main` remains `7454ee67a12dfe76dc7a4a7e7b77404059ceb2b0`.
- Review head `review/crm-1c-request-actions@16dc7ae0` is exactly 1 commit ahead / 0 behind production.
- Source push: **NOT APPROVED**.
- Auditor verdict: **Proceed with safeguards**.

## Live facts already accepted
Nath confirmed Approve/Cancel work and Request wall/status refresh works. Print still fails live. Admin Station is the CompuZign administration surface that controls platform data; do not reduce this defect to a generic Safari/browser-settings issue or confuse WordPress hosting mechanics with product architecture.

## Audit finding on `16dc7ae0`
The async-function explanation is not credible and must not be documented as root cause. An `async` function executes synchronously until its first `await`; the original code called `window.open()` before any await.

More importantly, `openIsolatedPrintDocument()` still calls:
`window.open('', '_blank', 'noopener,noreferrer,width=900,height=1000')`
and then treats a `null` return as popup blocking.

That contract is internally inconsistent: `noopener` in `windowFeatures` deliberately severs the opener relationship and browser implementations/spec guidance allow `window.open()` to return `null`; `noreferrer` also implies `noopener`. Therefore a successfully-created browsing context can be misclassified as “popup blocked.” The synchronous/non-async split in `16dc7ae0` does not remove this condition.

## Claude next action — narrow only
1. Correct `openIsolatedPrintDocument()` so the application can retain the same-origin blank window handle it needs to write/render/print. Do **not** pass `noopener`/`noreferrer` while expecting a usable returned handle.
2. After a usable blank window is obtained, detach `printWindow.opener = null` where supported before rendering. The print document never navigates to an untrusted origin; keep it code-owned and same-origin.
3. Genuine popup-blocking remains only `window.open(...) === null` under the corrected feature contract.
4. Remove the unsupported Safari/async root-cause commentary from source/docs. Record the actual defect: incompatible `noopener/noreferrer` return-handle contract.
5. Preserve the accepted UI correction: header Print icon beside ×; pending footer Cancel left / Approve right; terminal no footer mutation actions.
6. Extend the focused print contract to assert the window feature string no longer requests `noopener`/`noreferrer`, the returned handle is used, opener is detached after success, null still maps to genuine popup block, and stored-snapshot/no-secret/no-repricing invariants remain.
7. Run focused Request/print/customer parity suites, push review branch only, set **AWAITING CHATGPT REVIEW**, stop.

No lifecycle, schema, permissions, Request body/list/count, proposal formulas/styles, customer quote flow, or unrelated drawer changes.