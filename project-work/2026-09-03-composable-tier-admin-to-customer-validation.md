# Composable Tier — continuous work track

## Status
- **SOURCE PUSH APPROVED — Phase 0 reset only**
- Auditor verdict: **Proceed with safeguards**
- Current production/source: `main@eaead45338f9cc464e56d4510fa798d8b4c558b3`
- Approved review head: `review/upgrade-journey-finalisation@3e021964aea127840b00c278c322214c46e1c1b6`

## Accepted Phase 0 architecture
One active customer journey only: **Upgrade your plan/build**. Standalone Build Your Own is deferred and disabled. Upgrade must never fall through, relabel, transition, or survive as standalone Build Your Own.

Phase 0 does **not** implement the future Upgrade identity/finalisation pipeline yet. It only removes the hybrid Upgrade->Build Your Own design and isolates the live route cleanly.

## Platform identity direction retained for next phase
Use the **CompuZign Platform skill**. Reuse the existing Tier/Edition occupant identity/lifecycle/persistence/allocator/resolver/order pipeline.

- Tier: Default `CZT...`; Upgrade `CZTUXXXXX`; future Custom `CZTCXXXXX`
- Edition: Default `CZTE...`; Upgrade `CZTEUXXXXX`; future Custom `CZTECXXXXX`
- Existing `tierOccupantId` is the native identity foundation.
- `CZTC`/`CZTEC` remain reserved for later Build Your Own and must not be minted now.

## Auditor review result
Reviewed net Phase 0 chain from `main@eaead453` through `04b871e3`, `be0e10bf`, and `3e021964`.

Accepted findings:
- hybrid Finalise->Build Your Own machinery and its repair patches are removed;
- `FamilyTierAdapter` exposes composable browsing only when a Tier/Edition base exists and always in `upgrade_your_build` context;
- standalone Build Your Own is unreachable and explicitly TODO/deferred;
- removing the base removes dependent Upgrade + add-ons; swapping to a different base removes the Upgrade;
- same exact base reconfirm preserves the Upgrade;
- exact-base comparison is now correctly anchored on native `tierOccupantId` plus exact Edition identity, not display/platform fields;
- contracts cover remove-base, swap-base, occupant-change, and same-occupant/same-Edition preservation;
- no `CZTU`/`CZTEU` minting, new finalisation state machine, or Custom route was added.

Claude reports `tsc --noEmit`, build, docs check, and the relevant composable/package-family/quote-cart/tier contracts passing.

## Next action for Claude
Push **only the reviewed Phase 0 net diff at `3e021964`** to `main`; do not include unrelated work. Record the exact new `main` SHA and Hostinger deployment workflow/run in this file, then set **AWAITING LIVE VALIDATION**.

Live validation must confirm: no standalone Build Your Own entry point; Upgrade appears only with an existing Tier/Edition base; removing/swapping the base removes the Upgrade; same-base reconfirm keeps it; no customer-facing fallback to Build Your Own. Do not begin `CZTU`/`CZTEU` implementation until this Phase 0 live gate passes.