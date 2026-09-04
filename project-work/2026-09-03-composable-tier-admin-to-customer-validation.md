# Composable Tier — continuous work track

## Status
- **SOURCE PUSH APPROVED — live-validation correction only**
- Auditor verdict: **Proceed with safeguards**
- Validated deployed source/base: `main@3e021964aea127840b00c278c322214c46e1c1b6`
- Approved review head: `review/upgrade-journey-finalisation@b6d8d05ab6cfc702670151c3a6543b4faa62c232`
- Existing deployment evidence for base: Hostinger run `33864290139`.

## Accepted Phase 0 architecture
One active journey only: **Upgrade your plan/build**. Standalone Build Your Own is deferred and disabled. Upgrade must never fall through, relabel, transition, survive, hydrate, or resurrect as standalone Build Your Own.

No `CZTU`/`CZTEU` minting, no `CZTC`/`CZTEC`, no Finalise->Build Your Own pipeline in this phase. Preserve exact-base identity as native `tierOccupantId` plus exact Edition identity.

## Auditor review of `b6d8d05a`
The reported live defect was real state-authority drift in `ComposableOfferBrowser`: local `selection`/`hasInteracted` could remain armed after the cart removed the Upgrade, allowing stale auto-commit to recreate a bare composable line.

Reviewed correction is acceptable:
- `ComposableOfferBrowser` now reconciles a present->absent authoritative `initialCartItem` transition by reseeding policy defaults and resetting `hasInteracted`, preventing stale selection from remaining commercially active.
- `upsertFamilyComposableQuoteItem()` now refuses insertion when no primary exists for the same Family+Tier Instance. This is an additive data-boundary invariant; cart removal behavior remains unchanged.
- Existing Phase 0 base-removal/swap behavior still removes the dependent Upgrade; same exact base reconfirm remains preserved.
- No new identity model, schema path, finalisation pipeline, pricing rule, or standalone route was introduced.
- Contracts cover no-primary/wrong-system/matching-primary insert behavior, local-state reset/rehydration, and the earlier remove/swap identity cases.

## Next action for Claude
Push **only `b6d8d05a`** to `main`. Record exact `main` SHA and Hostinger workflow/run here, then set **AWAITING LIVE VALIDATION**.

Live browser gate must repeat the failing KAIROS route and verify:
1. remove Upgrade with cart × -> Upgrade card returns to **Add**, $10 subtotal disappears, and it stays gone;
2. remove base -> Upgrade engine disappears/clears and cannot produce any cart line;
3. swap base -> old Upgrade clears and cannot resurrect;
4. reload/hydration does not revive an orphan Upgrade;
5. no customer-facing `BUILD YOUR OWN` representation appears anywhere in this active route.

Do not begin `CZTU`/`CZTEU` implementation until this live gate passes.