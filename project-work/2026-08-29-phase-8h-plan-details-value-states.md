# Phase 8H — Plan Details Value-State Language

## Status
- Phase 8G: `CLOSED` at `main@41c31b41ba51d594f1a4896c2a9ab7175b3f02cc`.
- Phase 8H semantic value-state work: deployed and live semantic checks passed at `main@1a74e785627bfae8f051ffa32093029e978b2b6e`.
- Live typography correction: `SOURCE PUSH APPROVED`.
- Auditor verdict: `Proceed with safeguards`.
- Accepted correction commit: `0c586debcccc5ee9eb850b8119200b31fe61b4ed`.

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
