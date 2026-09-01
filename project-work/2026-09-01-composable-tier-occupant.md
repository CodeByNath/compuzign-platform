# Composable Tier occupant

## Status
- **READY FOR CLAUDE — Phase 1A foundation implementation only.**
- Auditor verdict: **Proceed with safeguards**.
- Base `main`: `7683a2f1b8d3b87819241f59d096e13a0786df28`.

## Accepted architecture
A Family keeps exactly one assigned Tier System / `CZTG`.

```text
Family
└─ assigned Tier System
   ├─ existing five-slot normal/Add-on occupants
   └─ subordinate composable child
      └─ exactly one full Tier occupant
```

The composable child is **not** a sixth peer slot, second Tier Instance, second Family assignment, or Add-on. It never competes with/replaces/controls the normal Tier choices.

Persist it as one optional sibling container on the existing Tier Instance, outside `tiers` (working name `composable_occupant`). The stored value must reuse the existing slot/occupant lifecycle shape (`current_occupant` + history), not invent a reduced occupant record.

The child container needs no Platform ID. Its occupant uses normal `CZT`; Editions/Legs retain `CZTE`/`CZTL`/`CZTEL`. Independent audit confirms Tier occupant native identity is `(tier_instance_id, occupant_id)`, explicitly not slot-qualified, so this reuse is valid.

Keep Tier Group status derivation based on the existing `tiers` collection. The subordinate composable occupant must not make its parent Tier System Active or otherwise become superior to it.

Public Family projection should expose this occupant separately from `tiers` (working key `composable_offer`) through the same Rate-Sheet-backed compiler and stripping rules.

## Phase 1A scope
Implement only the persisted/lifecycle/admin/projection foundation:
- optional subordinate slot on `TierInstanceSchema`, default absent/null;
- exact-one cardinality by shape (single slot, never array);
- dedicated addressing into that slot while reusing existing occupant Save/Publish/Disable/Enable/Edition/Leg/Rate-Sheet machinery;
- archive/restore/bin support, including a composable origin sentinel without adding it to `ALLOWED_TIERS`;
- admin launcher/surface sufficient to create and manage that one occupant;
- public projection as a separate sibling from normal `tiers`;
- focused backend/frontend contracts and affected Code Maps.

## Safeguards / non-scope
- Do not touch `TierAssignmentSchema` or create a second `CZTG`.
- Do not add `composable` to `ALLOWED_TIERS`.
- `is_addon` semantics remain untouched.
- Do not implement customer inclusion selection, quantity rules, Price Option choice, configurator UI, cart key changes, quote snapshot additions, PDF/email changes, or promotions yet.
- Existing Families with no composable child must remain behaviorally unchanged; no migration/backfill.

Commit/push Phase 1A to a review branch, report exact SHA, files and focused tests in this file, then set **AWAITING CHATGPT REVIEW**. Do not push to `main`.