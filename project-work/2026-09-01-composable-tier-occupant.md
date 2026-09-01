# Composable Tier occupant

## Status
- **AWAITING CHATGPT REVIEW — Phase 0 audit complete below. Do not implement source yet.**
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

## Claude — Phase 0 report

Read: root `AGENTS.md`, `docs/ai-index.md`, `docs/code-map/{tiers,tier-registration,tier-addon,commercial-legs,package-station,package-manager}.md`, `SurfacePackages/CLAUDE.md`, `TierAssignmentSchema.php`, `TierInstanceSchema.php`, `PackageRepository::findAllActiveFamiliesForCostBuilder()`/`resolveInstanceForService()`/`projectTierInstanceForCostBuilder()`, `resources/ts/utils/quote.ts`, `resources/ts/components/cost-builder/types.ts` (`FamilyTierQuoteItem`), and `useTierSystemController.ts`'s assignment helpers. Applied `compuzign-platform-architecture` skill's audit order throughout.

### 1. Smallest additive model

Add one field to the assignment row, nothing else to `TierInstanceSchema`:

- `TierAssignmentSchema` row gains `role: 'primary' | 'composable'`. Absence reads as `'primary'` (every existing row, zero migration).
- Scope both existing safeguards by `(type, id, role)` instead of `(type, id)`:
  - `consumer_already_assigned` becomes "one **primary** assignment per Family" *and independently* "one **composable** assignment per Family" — not "one assignment per Family." This is exactly what the doc's Family shape needs (primary + at most one composable child), and it does not relax the rule the safeguard exists to protect: a Family still can never hold two *peer primary* Tier Systems.
  - `instance_already_assigned` (one Family per Tier Instance) needs **no change** — a composable child is still its own Tier Instance row, owned by exactly one Family, same as today.
- `findForConsumer()` needs a role-aware overload/parameter; `assign()`'s conflict check switches to it. `TierInstanceSchema` itself stays untouched — it already "deliberately has no consumer, Family, Group, or assignment vocabulary," and that stays true.
- Registration/Publish flow for the child instance is the **same** `tier-register:[familyId]` → `TierSystemContent` → Publish path documented in `tier-registration.md`, just invoked a second time with `role: 'composable'` and a Family that already holds a primary assignment. No second controller, drawer, or endpoint family.

This is additive at the edge (one new discriminant field on one ledger row) and changes no storage shape anywhere else.

### 2. Identity

No new Platform ID family. `CZTG` already fits rung 3 exactly (independently addressable, and per `platform-id-families.md` a "new family" is only justified when *no existing family* covers the shape — this one does). The child Tier Group is simply a second **instance** of the existing `CZTG`/`TierInstanceSchema` shape:

- Publish assigns `CZTG` to the child's own `tier_instance_id` through the unchanged `tier-registration.md` flow — identity minting there is per-Tier-Instance, not primary/child-aware, so this needs no code change at all.
- The role tag lives only on the **assignment row** (Family↔Instance edge), never on the instance or on `CZTG` itself — consistent with "Parent-owned rules must not be derived from a child's own field": which Tier Group is "primary" vs "composable" is the Family-assignment's own fact, not something the Tier Group needs to know about itself.
- The occupant inside the child instance gets `CZT` (+ `CZTA` if ever marked `is_addon`, though the product model calls for exactly one *normal* occupant) through the same occupant Publish flow as any primary-instance occupant. Editions (`CZTE`) and Legs (`CZTL`/`CZTEL`) mint identically, unchanged.

### 3. Reuse of occupant lifecycle, Rate Sheet, Editions, Legs

Fully unchanged, verified structurally: the occupant engine (`PackageSchema.php`, `upsertOccupant`/`settleTierSlot`/`resolveCommercialLegTimeline()`/Edition transitions) addresses occupants purely by `(tier_instance_id, slotId)` and never branches on which Family or assignment owns the instance. `TierInstanceSchema` has zero Family/consumer fields by design (`SurfacePackages/CLAUDE.md`). A composable child's occupant is created, priced, bound to a Rate Sheet, given Editions, and given Default+Additional Legs through the exact same code paths a primary occupant uses — nothing in that layer needs to know it's the "one normal occupant of a composable child" rather than "occupant in slot `basic` of a primary Tier System." The five fixed slots (`ALLOWED_TIERS = [basic, standard, premium, enterprise, ultimate]`) are still the instance shape; "exactly one occupant" is a product/UI convention (fill one slot, leave four empty) enforced by *not offering* the other four slots in the composable-registration UI, not a schema change.

### 4. Public Family projection

`PackageRepository::findAllActiveFamiliesForCostBuilder()` currently does exactly one `TierAssignmentSchema::findForConsumer($assignments, 'package_family', $familyId)` per Family, resolves one instance, and flattens that instance's `tiers` map onto the Family row (confirmed by reading the method body — `$assignment = findForConsumer(...); if ($assignment === null) continue;` then a single `TierInstanceSchema::findInstance(...)`). To expose both paths without disturbing existing consumers:

- Look up primary via `findForConsumer(..., role: 'primary')` exactly as today (default role, so **existing behavior for every Family without a composable child is byte-for-byte unchanged**).
- Separately look up `findForConsumer(..., role: 'composable')`. If present and its instance is active, call the **same** `projectTierInstanceForCostBuilder()` against it — that method is already instance-scoped and Rate-Sheet-stripping, so it needs no change — and attach the result under a **new sibling key** (e.g. `composable_offer`) on the Family row, not merged into `tiers`. `tiers` staying primary-only preserves every existing "Choose your Tier" single-select consumer (`PricingTiers.tsx`, `ComparePlans.tsx`) with zero changes.
- Rate Sheet ids stay hidden by the same existing strip step; nothing new is exposed.

### 5. Cart/quote impact

`FamilyTierQuoteItem`'s line identity is `family:${familyPlatformId}:instance:${tierInstancePlatformId}[:primary|:addon:${tierPlatformId}]` (`quote.ts`, confirmed by reading `familyTierSystemKey`/`quoteItemKey`). Because the composable child is a genuinely distinct Tier Instance with its own `tierInstancePlatformId` (`CZTG`, point 2), a cart line for the composable occupant produces a **different** key than the family's primary-plan line automatically — same `familyPlatformId`, different `tierInstancePlatformId`. `replaceFamilyNormalQuoteItem`'s dedup is scoped by that full system key, so a primary-plan line and a composable-offer line coexist in the cart with **no `FamilyTierQuoteItem` shape change and no key collision** — this directly confirms the doc's hoped-for outcome in the "Critical current-source safeguard" section, provided the child gets its own instance identity as recommended above (it would *not* hold if the child were modeled as a same-instance sibling shape instead).

One genuinely new piece, out of scope for source in this phase: "admin-curated customer-selectable inclusions/qty/options" is customer configuration with no existing field to carry it. Per the product model's "must not mutate the published occupant," this wants a new **quote-time selection snapshot** carried on the `FamilyTierQuoteItem` line (or a sibling record keyed the same way) — not a Platform ID (rung 1/2 data, scoped entirely to the cart line), and not a mutation to the occupant's own admin-authored storage. Concrete shape is a Phase 1 design task, not decided here.

### 6. Migration / back-compat risks and files

No storage migration: every existing assignment row is silently `role: 'primary'` by omission. Risks found by tracing every current *consumer* of the assignment ledger, not just the two named safeguards:

- **`TierInstanceSchema::resolveInstanceForService()`** (`TierInstanceSchema.php:190`, called from `PackageRepository.php:1872` for the legacy Service-scoped index) requires `count($matches) !== 1` across *all* assignment rows for a Family and returns `null` otherwise. **This is a real regression risk**: adding an unscoped second assignment row for a Family that already has a primary would silently break that Family's *existing* legacy Service-index projection (2 matches → null → primary Tier disappears from that path) even though `findAllActiveFamiliesForCostBuilder()` looks fine. This function's match-filtering must be scoped to `role: 'primary'` as part of the same change in point 1 — it is not automatically covered by scoping `findForConsumer()` alone, since it iterates `$assignments` directly rather than calling that helper.
- `TierAssignmentSchema.php` — `assign()`, `sanitizeAssignments()`, `findForConsumer()` gain the `role` field/parameter.
- Frontend Family-picker "only Families holding no Tier System are selectable" filter (`tier-registration.md`; backed by `tool.assignments`, read through `useTierInstances.ts`/`useTierSystemController.ts`'s `assignedFamilyId`-style helpers) must become role-scoped: a Family with a primary assignment must still be excluded from *primary* registration, but must become newly eligible for *composable-child* registration — a second, role-aware selectability check, likely a new entry point next to the existing registration launcher rather than a change to the existing one.
- `usePackageFamilyCapabilities.ts`'s "Add Tier capability" write (documented sole writer of the post-creation Family→Tier assignment) needs a second, role-aware action ("Add composable Tier") alongside the existing one.
- `PackageRepository::findAllActiveFamiliesForCostBuilder()` — add the second, role-scoped lookup and `composable_offer` key (point 4).
- Contract/tests needing extension once source work starts: `tier-assignment-schema.php`, `tier-assignment-family-flow.php`, `tier-instance-public-projection.php`, `package-family-cart-contract.ts`, `package-family-request-flow-contract.ts`.

No other file in the traced chain (`PackageSchema.php`, `PackageManagerSchema.php`, `PackageRepository::projectTierInstanceForCostBuilder()`, Rate Sheet/Edition/Leg engines, `quote.ts`) needs a change to support the shape described in "Agreed product model" — they are already Family/role-agnostic by construction.