# Composable Tier occupant

## Status
- **READY FOR CLAUDE — architecture/source audit only. Do not implement source yet.**
- Auditor verdict: **Proceed with safeguards**.
- Production/base `main`: `7683a2f1b8d3b87819241f59d096e13a0786df28`.

## Agreed product model
Create a Family-level composable Tier path that reuses the existing Tier occupant engine rather than Rate Sheets or Add-ons becoming customer products.

Intended shape:

```text
Package Family
├─ existing primary Tier Group / Tier System
│  └─ existing occupants + Add-ons
└─ composable child Tier Group
   └─ exactly one normal Tier occupant
      ├─ CZT/lifecycle
      ├─ one bound Rate Sheet
      ├─ Editions
      ├─ Default + Additional Commercial Legs
      ├─ commitment/headline metadata
      └─ admin-curated customer-selectable inclusions/qty/options
```

Customer presentation may call the same composable offer **Build Your Own** when entered independently and **Add Extras** when shown after another plan. Do not repurpose `is_addon` or create a second pricing/Edition/Leg engine.

Customer configuration must not mutate the published occupant. Admin defines what is selectable and the permitted quantity/Price Option/Leg choices; the selected composition becomes the quote-time snapshot.

## Critical current-source safeguard
Current `TierAssignmentSchema` enforces one assignment per Family and one Family per Tier Instance (`consumer_already_assigned` / `instance_already_assigned`). `tier-registration.md` likewise says only Families holding no Tier System are selectable. Therefore **do not simply relax the assignment ledger to allow two peer Tier Systems** without proving that is the intended architecture.

The existing Family quote key includes `familyPlatformId + tierInstancePlatformId`, so a genuinely distinct child group could coexist downstream, but the current Family discovery/projection path resolves a singular assignment and must be audited before relying on that.

## Claude — Phase 0 task
Read root `AGENTS.md`, `docs/ai-index.md`, `tiers.md`, `tier-registration.md`, `tier-addon.md`, `commercial-legs.md`, Package Family/customer projection code, `TierAssignmentSchema`, Tier Instance schema/controller, and Family quote construction.

Report back in this same file with:
1. the smallest additive ownership/persistence model for a **Family-owned composable child Tier Group containing exactly one occupant** while preserving the existing primary Family→Tier System assignment invariant;
2. exact identities/relationships and whether the child needs CZTG or a distinct child-group identity;
3. how existing occupant lifecycle, Rate Sheet selection, Editions and Legs can be reused unchanged;
4. how public Family projection discovers both primary and composable paths without exposing Rate Sheets;
5. cart/quote impact, especially whether existing `FamilyTierQuoteItem` and keying can remain unchanged;
6. migration/backward-compatibility risks and exact files likely affected.

No implementation, migration, build, deployment, or source push in Phase 0. Set status to **AWAITING CHATGPT REVIEW** after the report.