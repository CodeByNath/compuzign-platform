# Composable Tier occupant

## Status
- **READY FOR CLAUDE — corrected architecture audit only. Do not implement source yet.**
- Auditor verdict: **Proceed with safeguards**.
- Base `main`: `7683a2f1b8d3b87819241f59d096e13a0786df28`.

## User-corrected architecture
The prior Phase 0 assumption of a second Family→Tier Group assignment is **rejected**.

A Package Family continues to know exactly **one** assigned Tier System / Tier Group. Do not add a second assignment role, do not relax `TierAssignmentSchema`, and do not make a second peer `CZTG` attached to the Family.

Target shape:

```text
Package Family
└─ existing assigned Tier System / CZTG
   ├─ existing normal occupants (five-slot system)
   ├─ existing Add-on occupants
   └─ new subordinate composable child
      └─ exactly one full Tier occupant
```

The new occupant is effectively an additional/sixth occupant capability, but it is **not a peer normal slot and never competes with, replaces, outranks, or becomes superior to the existing primary Tier occupants**. The Tier System owns the subordinate child; the Family does not independently know or assign it.

That single occupant should reuse normal occupant capabilities: CZT lifecycle, one bound Rate Sheet, Editions, Default + Additional Commercial Legs, commitment/headline metadata, archive/restore/disable behavior, etc. `is_addon` remains unchanged and is not reused for this.

Customer presentation can show the same subordinate composable occupant as **Build Your Own** when entered directly and **Add Extras** when a normal plan is already selected.

Customer choices must never mutate the published occupant. Admin defines permitted inclusions/quantities/Price Options/commercial choices; customer configuration becomes a quote-time snapshot.

## Safeguards
- Preserve the existing singular Family→Tier System assignment contract completely.
- Do not model the subordinate child as a second Tier Instance merely to obtain cart identity.
- Do not let the composable occupant enter the existing exclusive-normal selection set where it could replace a primary Tier.
- Do not make “exactly one occupant” UI-only; ownership/cardinality must be authoritative.
- Do not redesign Rate Sheets, Editions, Commercial Legs, or Add-on semantics.

## Claude — corrected Phase 0 task
Re-audit current source and report the **smallest additive model inside the existing Tier System** for this subordinate composable child. Specifically establish:
1. where the child should persist under the existing Tier Instance and why;
2. whether the child container needs any identity at all, and how its one occupant reuses existing `CZT` identity/lifecycle without becoming a sixth peer slot;
3. how to reuse existing occupant/Edition/Leg/Rate Sheet machinery with minimal branching;
4. how public Family projection exposes the composable child separately from normal `tiers` so it can never replace/compete with them;
5. the smallest cart/quote treatment needed for coexistence with the selected normal Tier **without creating a second Family Tier System**;
6. exact backend/frontend/tests/docs affected and any migration risk.

No implementation, migration, build, source push, or deployment yet. Record the report here and set **AWAITING CHATGPT REVIEW**.