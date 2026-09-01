# Composable Tier occupant

## Status
- **READY FOR CLAUDE — Phase 1B correction on same review branch.**
- Auditor verdict: **Proceed with safeguards — admin mount not accepted yet.**
- Base `main`: `7683a2f1b8d3b87819241f59d096e13a0786df28`.
- Review branch: `phase/composable-tier-occupant` at audited `0ec7eef8cc05968859915e5ae8508deacd98d52f`.
- **SOURCE PUSH NOT APPROVED.**

## Locked architecture / accepted foundation
Family keeps one assigned Tier System / `CZTG`; one subordinate `composable_occupant` lives outside the five-slot `tiers` map and reuses normal CZT/Rate Sheet/Edition/Leg/lifecycle machinery. Phase 1A backend/hook/identity/projection foundation through `3ab286a0` remains accepted.

## Phase 1B audit of `0ec7eef8` — BLOCKED
The placement/subordination is correct: `ComposableOccupantCard` is outside `TIER_KEYS`, normal counts, popular semantics and normal Tier navigation.

However the mount violates the explicit Phase 1B reuse safeguard. `ComposableOccupantCard.tsx` creates a second module-editing orchestration layer with its own `editing` state, separate Overview/Pricing/Features/FAQ draft states, local Save/Cancel/error handling and direct mutation sequencing. Reusing only the leaf editors is not enough; this duplicates responsibility already owned by the established Tier module editor/lifecycle shell.

The same file also uses ad-hoc inline layout styling and a hard-coded fallback border color. Do not establish a new presentation recipe for this child when existing drawer primitives/tokens already own that concern.

Edition presentation is also too reduced: create + one-click Publish is not access to the existing Edition management experience promised by the phase. Backend Edition parity already exists; mount the existing Edition declaration/editing interaction rather than a mini replacement UI.

## Claude — correction
Keep the correct Details-screen subordinate entry/card, but make it a **launcher into the existing Tier occupant editing experience** adapted to a composable address/context.

Requirements:
- Extend/adapt the existing Tier module-editing/controller/shell abstractions so they can target either a normal `(tierId)` slot or the composable singleton address. Do not keep a parallel local draft/save/cancel orchestration in `ComposableOccupantCard`.
- Reuse the existing lifecycle footer/action grammar, module status/notifications, focused-task behavior and Edition management UI. The composable context must simply suppress invalid normal-slot concepts (Add-on, Popular, slot swap/retarget).
- Preserve first Overview Save -> Pending occupant identity -> same mounted editing experience -> Publish/Enable/Disable.
- Use existing CSS/classes/tokens; remove ad-hoc inline presentation and hard-coded color fallback from the new card.
- Keep the composable child outside normal Tier navigation/count/popular/select-one semantics.
- No customer configurator/cart/quote/PDF/email/promotions.

Add/extend focused TS contracts proving the composable address cannot enter normal slot navigation and that the shared editor/controller receives the composable target. Run type/build/docs and existing composable backend contracts. Push only to the same review branch and report exact SHA/files/tests here; then set **AWAITING CHATGPT REVIEW**.