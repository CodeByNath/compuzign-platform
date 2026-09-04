# Composable Tier — continuous work track

## Status
- **SOURCE PUSH APPROVED — 2nd-round live correction only**
- Auditor verdict: **Proceed with safeguards**
- Current deployed/source base: `main@b6d8d05ab6cfc702670151c3a6543b4faa62c232`
- Approved review head: `review/upgrade-journey-finalisation@a4a23920c8f84c2bd457790847d2525504270d67`
- Existing deployment evidence for base: Hostinger run `33867191849`.

## Accepted architecture
One active journey only: **Upgrade your plan/build**. Standalone Build Your Own remains deferred/disabled. Upgrade must never exist, price, persist, hydrate, resurrect, or act without its exact ready Tier/Edition base.

No `CZTU`/`CZTEU` minting yet; `CZTC`/`CZTEC` remain reserved for later Custom/Build Your Own. Preserve native `tierOccupantId` + exact Edition identity and the existing occupant pipeline.

## Auditor review of `a4a23920`
Independently confirmed `main` is still `b6d8d05a` and the review head is one commit ahead.

The correction is accepted:
- actual scoped primary item is threaded `PackageBuilderApp -> FamilyTierAdapter -> ComposableOfferBrowser`;
- the existing `selectedTierId !== null` render gate remains intact;
- `ComposableOfferBrowser` independently derives readiness from `primaryItem !== null`;
- Add/Remove and quantity controls are disabled without a ready primary and handlers independently refuse action;
- auto-preview/commit bails before starting pricing when no primary and reacts to readiness loss;
- readiness loss also clears local selection/interaction state, preserving the prior cart-line disappearance reconciliation;
- cart mutation/removal behavior is unchanged; no identity/schema/pricing/finalisation/Build Your Own machinery added.

Claude reports typecheck, build, docs check and relevant composable/package-family/quote/tier contracts passing.

## Next action for Claude
Push **only `a4a23920`** to `main`. Record exact new `main` SHA and Hostinger workflow/run in this file, then set **AWAITING LIVE VALIDATION**.

Live browser gate must verify from a fresh KAIROS route:
1. empty/no authoritative primary: Upgrade cannot be operated and produces no preview/subtotal/cart state;
2. ready exact primary: Upgrade Add/Remove works normally;
3. cart × removes Upgrade -> card/subtotal reset and stay reset;
4. remove or swap base -> Upgrade state clears immediately and cannot resurrect;
5. reload/hydration cannot revive an orphan;
6. no customer-facing `BUILD YOUR OWN` appears anywhere in the active Upgrade route.

Do not begin `CZTU`/`CZTEU` implementation until this live gate passes.