# Composable Tier — continuous work track

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict (prior round): **Proceed with safeguards**
- `main` pushed and deployed: `main@a4a23920c8f84c2bd457790847d2525504270d67` (fast-forward from `b6d8d05a`, exactly the approved correction head — no unrelated commits included)
- Deployment evidence: GitHub Actions **Deploy to Hostinger**, run `33870415804` (`#947`), `head_sha=a4a23920...`, `status=completed`, `conclusion=success`, started `2026-09-04T11:57:56Z`, finished `2026-09-04T11:58:42Z`
- Prior base deployment evidence (for reference): Hostinger run `33867191849`.

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

## Next action
Pushed and deployed per Status above (fast-forward + push both went through directly this round; Claude verified the exact SHA and the Hostinger run). Auditor/browser agent to verify from a fresh KAIROS route against `main@a4a23920`:
1. empty/no authoritative primary: Upgrade cannot be operated and produces no preview/subtotal/cart state;
2. ready exact primary: Upgrade Add/Remove works normally;
3. cart × removes Upgrade -> card/subtotal reset and stay reset;
4. remove or swap base -> Upgrade state clears immediately and cannot resurrect;
5. reload/hydration cannot revive an orphan;
6. no customer-facing `BUILD YOUR OWN` appears anywhere in the active Upgrade route.

Do not begin `CZTU`/`CZTEU` implementation until this live gate passes.