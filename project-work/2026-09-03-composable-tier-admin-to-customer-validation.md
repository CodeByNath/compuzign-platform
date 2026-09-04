# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — PHASE 0 CORRECTION REQUIRED**
- Auditor verdict: **Stop — architectural risk**
- Current production/source: `main@eaead45338f9cc464e56d4510fa798d8b4c558b3`
- Reviewed Phase 0 head: `review/upgrade-journey-finalisation@04b871e334e4c8bd55b95ad05651bb7078bd6c1b`

## Architecture direction
There is **one active customer journey only: Upgrade your plan/build**. Standalone **Build Your Own** is deferred and disabled. Upgrade must never fall through, relabel, transition, or survive as standalone Build Your Own.

## Platform identity / occupant rule
Use the **CompuZign Platform skill** for identity work. Reuse the existing Tier/Edition occupant identity, lifecycle, persistence, allocator, resolver and ordering pipelines — no parallel system.

- Default Tier `CZT...`; Upgrade `CZTUXXXXX`; future Custom `CZTCXXXXX`
- Default Edition `CZTE...`; Upgrade `CZTEUXXXXX`; future Custom `CZTECXXXXX`
- `CZTC`/`CZTEC` are reserved for the later Build Your Own phase; do not mint them now.
- Upgrade/Custom variants must use the same occupant ordering/sort mechanism once that mechanism is identified/extended.

## Auditor review of Phase 0 head
The net reset `eaead453..04b871e3` correctly removes the three hybrid Finalise->Build Your Own corrections and gates `ComposableOfferBrowser` so it renders only with an already-selected Tier/Edition, always in `upgrade_your_build` context. The TODO for future standalone Build Your Own is correctly left at the entry point. The review diff preserves the pre-hybrid composable browsing/pricing path and removes the hybrid composed-snapshot/request/email machinery.

**Blocking issue:** Claude reports that `removeFamilyTierSystemQuoteItems()` still preserves a composable line when its primary Tier/Edition is removed. That behavior existed to support standalone Build Your Own. With standalone now disabled, it is no longer valid for the active route: a customer can create an Upgrade, remove/swap the base, and leave an orphaned composable item that effectively becomes the forbidden standalone state.

## Exact Phase 0 correction
1. In the active upgrade-only regime, removing or replacing the exact base Tier/Edition must also remove the dependent Upgrade composable line. No orphan may survive.
2. Do this through the existing cart/occupant mutation path; do not add another state machine, identity type, or Build Your Own fallback.
3. Preserve normal add-on cascade behavior and unrelated standalone code that is merely dormant for the later phase, except where its current runtime behavior can still create an orphan from the active Upgrade route.
4. Add/update a focused contract: select base -> commit Upgrade -> remove base, and base -> commit Upgrade -> replace/switch base. In both cases the Upgrade line must be gone, not relabeled or preserved.
5. Do **not** implement `CZTU`/`CZTEU` minting or unified Upgrade finalisation yet. Phase 0 remains cleanup/isolation only.

Return changed files, tests, exact review SHA, and confirm no customer-reachable path can produce standalone Build Your Own. Set **AWAITING CHATGPT REVIEW**. Do not push to `main`.