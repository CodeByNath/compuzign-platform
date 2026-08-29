# Phase 8H — Plan Details Value-State Language

## Status
- Phase 8G: `CLOSED` at `main@41c31b41ba51d594f1a4896c2a9ab7175b3f02cc`.
- Phase 8H semantic value-state work: deployed and live semantic checks passed at `main@1a74e785627bfae8f051ffa32093029e978b2b6e`.
- Live typography correction: `AWAITING LIVE PDF VALIDATION`.
- Source/deployment: `PUSHED — exact accepted commit, fast-forward only`; workflow succeeded.
- Auditor verdict: `Proceed with safeguards` — on-screen correction passed; native PDF preview remains the final gate.
- Production: `main@0c586debcccc5ee9eb850b8119200b31fe61b4ed`.

## Locked Display Rules
Bundle child Unit Price/Total = **Included**. Open-ended Charge Occurrences = **Until Canceled**. Open-ended known-rate Subtotal = formatted known Rate. Open-ended TCV = **Until Canceled** when rates are known. Missing/unresolved price = **To be confirmed**. Real numeric zero = **$0.00**. Finite minimum-term streams keep calculated occurrences/subtotals. A Period with any unresolved top-level `line_total` cannot show a partial total. Due at plan start cannot silently omit an unresolved starting rate.

## Live Finding
Production semantic behavior passed. Visual validation found `.cz-proposal__total-amount` at `1.5rem` and primary amount at `2rem`, making Review & Finalise Quote / printable proposal totals over-emphasized. Required correction: base `var(--cz-font-size-lg)`, primary `var(--cz-font-size-xl)`, no behavioral or copy changes.

## Independent Audit — 2026-08-30
Compared production `1a74e785...` to candidate `0c586deb...`: candidate is exactly **1 commit ahead, 0 behind**, merge base = production SHA.

Actual changed scope:
- `resources/css/modules/cost-builder.css`
- rebuilt `dist/css/cost-builder.css`
- `scripts/quote-proposal-total-typography-contract.ts`
- `package.json`

Source inspection confirms only the two requested declarations changed:
- base total amount → `var(--cz-font-size-lg)`
- primary total amount → `var(--cz-font-size-xl)`

Existing weight/color/nowrap remain. Current print block contains no `.cz-proposal__total-amount` override, so no separate literal print size is reintroduced. No JSX, arithmetic, resolver, pricing, identity, persistence, quote snapshot, or routing change exists in this correction.

Safeguard: the focused contract's print-block regex is not a substitute for live print/PDF validation. Acceptance still requires post-deploy browser validation of both on-screen Review & Finalise Quote and printable/PDF output.

## Claude — Next Action
1. Confirm `origin/main` is still exactly `1a74e785627bfae8f051ffa32093029e978b2b6e`.
2. Fast-forward `main` to **exactly** `0c586debcccc5ee9eb850b8119200b31fe61b4ed`; no amend/rebuild/source edits.
3. Push `main`; let the normal GitHub Actions Hostinger deployment run.
4. Record exact resulting `main` SHA and workflow run/status here.
5. Set status `AWAITING LIVE VALIDATION` and stop.

## Final Gate
Nath/ChatGPT must validate the deployed customer surface. Phase 8H closes only when pushed SHA, successful deployment, on-screen typography, and printable/PDF typography agree.

## Production Push Record

- Status: PUSHED
- Pushed by: Claude Code
- Pushed at: 2026-08-30
- Pre-push check: `origin/main` confirmed exactly `1a74e785627bfae8f051ffa32093029e978b2b6e` before push — matched, no divergence. Local `main` checked out fresh from `origin/main` (same SHA), then fast-forward merged to `phase-8h-plan-details-value-states@0c586deb...` (confirmed via `git ls-remote origin phase-8h-plan-details-value-states` to be the exact accepted SHA before merging) — no amend/rebuild/source changes, pure fast-forward.
- Push output: `1a74e785..0c586deb  main -> main`
- Full `main` commit SHA (confirmed via `git ls-remote origin main`): `0c586debcccc5ee9eb850b8119200b31fe61b4ed` — equals the accepted SHA exactly.
- GitHub Actions run: `33258359096` ("Deploy to Hostinger"), triggered by push on 2026-08-30
- Workflow result: `SUCCESS` (confirmed via the public `api.github.com/repos/.../actions/runs/33258359096` endpoint, polled until `status: completed` — `conclusion: success`)
- Job/step-level results, all `success`: Set up job; Checkout repository; Setup Node.js; Install frontend dependencies; Build frontend assets; Deploy source via SSH; Deploy built dist assets via SCP; Post Setup Node.js; Post Checkout repository; Complete job.
- Deployment result: workflow-reported success for deployed SHA `0c586debcccc5ee9eb850b8119200b31fe61b4ed`. Actual on-screen and printable/PDF typography not independently checked from this environment.

## Live Browser Validation
- On-screen Review & Finalise Quote: PASS on production `main@0c586debcccc5ee9eb850b8119200b31fe61b4ed`.
- Expanded full quote confirmed both `Ongoing` and `$160,675` at `22.4px` = `var(--cz-font-size-xl)`, weight 800 and nowrap preserved; neither value overflows its totals block.
- Browser console errors: none.
- Print / Save as PDF was invoked. The browser handed off to its native print preview, which is outside the controllable page DOM; rendered PDF pixels could not be independently inspected from this environment.
- Final status: `AWAITING LIVE PDF VALIDATION`. Nath must confirm the native preview/saved PDF shows both values at the corrected restrained size. Do not close Phase 8H until that result is recorded.
