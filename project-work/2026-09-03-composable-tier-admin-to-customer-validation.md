# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — Phase 0 live gate failed**
- Auditor verdict: **Stop — architectural risk**
- Validated deployed source: `main@3e021964aea127840b00c278c322214c46e1c1b6`
- Deployment evidence already accepted: Hostinger run `33864290139`, successful for the exact SHA.
- Browser validation date: 2026-09-04.

## Accepted Phase 0 architecture
One active customer journey only: **Upgrade your plan/build**. Standalone Build Your Own is deferred and disabled. Upgrade must never fall through, relabel, transition, or survive as standalone Build Your Own.

Phase 0 does not implement the future Upgrade identity/finalisation pipeline. Do not mint `CZTU`/`CZTEU`, introduce `CZTC`/`CZTEC`, or restore the removed Finalise-to-Build-Your-Own machinery.

Preserve the accepted exact-base rule: native `tierOccupantId` plus exact Edition identity. Removing the base must remove its Upgrade and attached add-ons; swapping to a genuinely different base must remove the Upgrade; reconfirming the same exact base may preserve it.

## Live browser findings
Validated on the customer pricing page in the KAIROS — IaaS route.

1. **FAIL — direct Build Your Own remains exposed.**
   - User evidence shows an upgrade-only cart line labelled `KAIROS — IaaS / BUILD YOUR OWN` with Monthly $10 and estimated monthly total $10.
   - The upgrade surface simultaneously shows Block Storage $10 with **Remove**.
   - This is the prohibited standalone/fallback representation. Phase 0 must never expose Build Your Own.

2. **FAIL — cart removal is only one-way.**
   - Starting with Business Pro selected, adding Block Storage correctly changes the card to **Remove**, adds a separate `UPGRADES / Monthly $10` cart item, and changes the total from $675 to $685.
   - Removing that Upgrade through its cart × correctly removes the cart row and returns the total to $675.
   - However, the upgrade card remains **Remove**, retains Block Storage $10, and retains the `$10 / mo Ongoing` upgrade subtotal. The editor therefore disagrees with the authoritative cart.
   - Removing the Business Pro base afterwards clears the quote cart but still leaves Block Storage selected and priced in **Upgrade your build**, with no active Tier/Edition base.
   - Adding and removing through the upgrade card itself synchronizes the cart correctly. The failure begins when the Upgrade is removed with the cart ×: the cart row disappears, but the upgrade card remains selected with its $10 subtotal. If the base is removed after that, the orphaned Upgrade still remains active in the upgrade editor and can subsequently surface as the prohibited upgrade-only Build Your Own item.

These behaviors reproduce the user’s marked evidence. They also provide the stale orphan state that can surface the invalid upgrade-only Build Your Own cart item.

## Exact fix request for Claude
1. Make cart-originated removal use the same authoritative Upgrade removal transition as the upgrade-card **Remove** action. It must clear the committed Upgrade selection, preview/subtotal, selected-card state, and derived cart projection together.
2. When a Tier/Edition base is removed by cart × or **Clear all**, atomically remove its dependent Upgrade and attached add-ons from both cart and upgrade editor state. Do not leave the Upgrade surface selected or commercially active without an exact base.
3. Ensure no reducer, hydration/reload, fallback, or projection path can materialize an Upgrade as a `BUILD YOUR OWN` item. If no exact base exists, discard the orphan Upgrade rather than relabelling it.
4. Keep the Phase 0 non-change boundary: no finalisation pipeline, standalone Build Your Own route, new identities, schema changes, pricing changes, or unrelated UI redesign.
5. Add regressions for:
   - add Upgrade, remove its cart row: card returns to **Add**, subtotal disappears, base total restores;
   - add Upgrade, remove base through cart ×: base, Upgrade, and attached add-ons all disappear from every surface;
   - **Clear all** performs the same cascade;
   - reload/hydration with an orphan Upgrade does not show Upgrade UI state or a Build Your Own cart item;
   - same exact base reconfirm preserves Upgrade, while genuinely different base replacement removes it.

Report root cause, changed files, tests, source/review SHAs, and deployed SHA. Set this file to **AWAITING CHATGPT REVIEW** when ready. Do not push product source until the gate permits it.
