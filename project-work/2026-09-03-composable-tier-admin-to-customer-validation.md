# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — Phase 0 live gate failed**
- Auditor verdict: **Stop — architectural risk**
- Validated deployed source: `main@b6d8d05ab6cfc702670151c3a6543b4faa62c232`
- Deployment evidence already accepted: Hostinger run `33867191849`, successful for the exact SHA.
- Browser validation date: 2026-09-04.

## Accepted Phase 0 architecture
One active journey only: **Upgrade your plan/build**. Standalone Build Your Own is deferred and disabled. Upgrade must never fall through, relabel, transition, survive, hydrate, or resurrect as standalone Build Your Own.

No `CZTU`/`CZTEU` minting, no `CZTC`/`CZTEC`, and no Finalise-to-Build-Your-Own pipeline in this phase. Preserve exact-base identity as native `tierOccupantId` plus exact Edition identity.

The quote cart is working correctly and is a strict non-change boundary. Do not modify its removal, projection, or rendering behavior to accommodate invalid state emitted by the new Upgrade engine.

## Accepted correction at `b6d8d05a`
The prior stale-selection correction and same-Family+Tier primary invariant remain directionally correct. Cart removal behavior must remain unchanged. This new finding closes an earlier point in the same authority boundary: the Upgrade engine still exposes an enabled action before a valid primary exists.

## Live browser finding
**FAIL — Upgrade your build accepts an Upgrade while the cart has no primary Tier/Edition.**

- With the quote cart empty, the **Upgrade your build** section remains exposed.
- Its Block Storage card shows `$0 per unit` and an enabled yellow **Add** button.
- The empty state underneath says “No inclusions selected yet,” confirming there is no committed primary-backed Upgrade.
- The user can therefore fire the new engine outside a ready cart/primary context.
- When fired, the Upgrade engine can show Block Storage $10, **Remove**, and `$10 / mo Ongoing`, but the cart cannot validly represent it because it has no primary. This is an Upgrade-engine misfire, not a cart defect.
- The earlier evidence of an upgrade-only `BUILD YOUR OWN / Monthly $10` line is the prohibited downstream fallback from this invalid state.

## Exact fix request for Claude
1. In **Upgrade your build**, disable every Upgrade **Add** action unless the authoritative quote cart already contains the exact ready primary Tier/Edition for that Family+Tier Instance.
2. Empty cart, removed primary, mismatched primary, primary still being committed, and otherwise-not-ready primary states must all be non-interactive.
3. The disabled state must be enforced at both UI and Upgrade-engine/domain boundaries. A click, stale handler, hydration, or programmatic call must not start preview, pricing, persistence, or projection without the exact primary.
4. When no exact primary exists, clear or ignore any local Upgrade selection and subtotal. Do not emit an item for the cart to handle, and never fall back to `BUILD YOUR OWN`.
5. Keep the cart unchanged. The cart must not be amended to print, accept, repair, or render this invalid Upgrade state.
6. Preserve the accepted `b6d8d05a` reconciliation behavior, base-removal/swap cascade, and same-exact-base reconfirm behavior.
7. Do not introduce new identity models, schema paths, pricing changes, finalisation machinery, standalone Build Your Own, or unrelated UI redesign.

## Required regressions
- Empty cart: Upgrade **Add** is disabled; invocation cannot create preview, subtotal, persistence, or cart output.
- No exact/matching primary: same guard at domain boundary even if UI is bypassed.
- Primary pending/not ready: Upgrade remains disabled until the exact primary is authoritatively present.
- Remove primary: Upgrade action disables immediately, local selection/subtotal clears, and nothing resurrects.
- Matching ready primary: Add/Remove continues to work and the cart remains unchanged.
- Reload/hydration with an orphan Upgrade: no active selection and no `BUILD YOUR OWN` output.

Report root cause, changed files, tests, source/review SHAs, and deployed SHA. Set this file to **AWAITING CHATGPT REVIEW** when ready. Do not push product source until the gate permits it.
