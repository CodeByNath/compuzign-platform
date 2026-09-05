# Composable Tier — continuous work track

## Status
- **SOURCE PUSH APPROVED — UI interaction/token corrections through `c9072b69`**
- Auditor verdict: **Proceed with safeguards**
- Production/base independently confirmed: `main@db154aa7b081c458a0784a7d52b51449e0757531`
- Approved review head: `review/upgrade-journey-finalisation@c9072b693d8627ee70ec486cdc2b60656b64806b`

## Architecture / non-change boundaries
One active customer journey only: **Upgrade your plan/build**. Standalone Build Your Own remains deferred/disabled. Preserve native `tierOccupantId` plus exact Edition identity, cart authority/removal semantics, readiness/hydration guards, schema, Rate Sheet authority, and the accepted raw-number money pipeline/presentation-only precision normalization.

Do not change cart removal behavior, commercial totals, pricing calculations, identity, or unrelated page layout.

## Auditor review result
Reviewed the actual one-commit diff `db154aa7..c9072b69` and relevant source.

Accepted:
- Upgrade row marker/action styling is neutral by default and token-driven; add/remove color appears only on hover/focus states. Quantity input now uses CompuZign surface/text/border tokens rather than browser-default white styling.
- Quote disclosure toggle is a separate control immediately left of the independent cart remove × in one top-right action cluster.
- Disclosure coordination is structurally corrected: one `openKey` per list, functional atomic toggle, one outside-click listener, all disclosure toggles excluded from generic dismissal, open panel subtree excluded, at most one panel open.
- Panel remains rendered in normal list-item flow and continues to push later content rather than overlay it.
- Total Commitment reuses the same `useSingleOpenDisclosure()` coordinator/components rather than duplicating interaction logic.
- Detached Upgrade `$X / mo Ongoing` preview presentation is removed while `preview.summaries` and commit/removal/pricing authority remain untouched.
- Existing readiness guards, cart authority, hydration behavior, decimal precision, and no-Build-Your-Own protections are not reopened.
- Claude reports typecheck, build, docs check, all relevant composable/quote/payment contracts and real-DOM loop regression green.

## Next action for Claude
Push **only the reviewed work through `c9072b69`** to `main`, deploy through normal GitHub Actions -> Hostinger, record exact `main` SHA and workflow/run result here, then set **AWAITING LIVE VALIDATION**.

## Live browser gate
Validate from a fresh KAIROS customer route:
1. Upgrade list marker and +/× controls are visually neutral and consistent with cart controls; quantity input renders correctly in the active theme.
2. Each quote chevron sits immediately left of its independent remove ×.
3. Open one disclosure, then click another: first click closes old and opens new; never requires a second click; only one remains open.
4. Click inside open panel does not close it; genuine outside click closes it.
5. Disclosure remains in-flow and pushes following quote rows.
6. Detached Upgrade aggregate is absent, while row prices and cart/Details/Total Commitment aggregates remain correct.
7. Decimal examples `$0.10`, `$0.023`, `$0.004` remain correct where configured.
8. No customer-facing Build Your Own label; base removal/swap and Upgrade removal/reload safeguards remain correct.

Do not begin `CZTU`/`CZTEU` until this live gate passes.