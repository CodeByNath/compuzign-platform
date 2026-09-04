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

1. **FAIL — the new Upgrade your build engine still contains Build Your Own authority.**
   - The **Upgrade your build** Block Storage card can remain selected as **Remove**, retain a $10 value, and retain a `$10 / mo Ongoing` subtotal after its Upgrade item no longer exists in the cart.
   - After the Tier/Edition base is removed, this engine can continue carrying the selected Block Storage state without any base.
   - User evidence shows that orphaned state being materialised as `KAIROS — IaaS / BUILD YOUR OWN`, Monthly $10.
   - Therefore the Phase 0 removal is incomplete: the Upgrade engine’s Add/Remove state or its retained projection still has standalone Build Your Own authority. It must be base-dependent Upgrade state only.

2. **PASS — the existing cart performs its requested removals correctly and is not the component to amend.**
   - With Business Pro selected, adding Block Storage produces the expected separate `UPGRADES / Monthly $10` cart row and $685 combined total.
   - Clicking the Upgrade cart × correctly removes that row and restores the cart total to $675.
   - Clicking the base cart × correctly removes the base from the cart.
   - The malfunction is outside the cart: **Upgrade your build** fails to consume the resulting authoritative cart/base state and continues displaying and pricing a removed/orphaned selection.

## Exact fix request for Claude
1. **Do not modify, replace, or redesign the cart removal behavior.** Treat the cart and its current × removal results as the working authority and a strict non-change boundary.
2. Correct the new **Upgrade your build** engine so its Add/Remove selection, preview, pricing subtotal, and any retained projection are derived from and reconciled with the active exact Tier/Edition base and authoritative cart state.
3. When the cart no longer contains the Upgrade, the Upgrade card must return to **Add**, its subtotal must disappear, and no Upgrade selection may remain cached or commercially active.
4. When the cart no longer contains the base, **Upgrade your build** must have no active Upgrade state. It must not retain Block Storage, remain on **Remove**, show $10 ongoing, or create any quote/cart representation.
5. Remove any remaining Build Your Own authority, label, fallback, persistence, hydration, or projection from **Upgrade your build**. An Upgrade without an exact base must be discarded; it must never become a `BUILD YOUR OWN` item.
6. Keep the Phase 0 non-change boundary: no cart changes, no finalisation pipeline, no standalone Build Your Own route, no new identities, no schema/pricing changes, and no unrelated UI redesign.
7. Add engine-focused regressions that leave existing cart behavior untouched:
   - after the cart removes an Upgrade, the Upgrade engine observes that state and resets the card to **Add**, removes its subtotal, and retains no Upgrade projection;
   - after the cart removes the base or clears the quote, the Upgrade engine clears all dependent Upgrade state;
   - hydration/reload cannot revive an orphan Upgrade or expose Build Your Own;
   - same exact base reconfirm may preserve Upgrade, while a genuinely different or absent base clears it.

Report the exact stale authority/root cause inside **Upgrade your build**, changed files, tests, source/review SHAs, and deployed SHA. Set this file to **AWAITING CHATGPT REVIEW** when ready. Do not push product source until the gate permits it.
