# Composable Tier occupant

## Status
- **AWAITING CHATGPT REVIEW — corrected Phase 0 audit complete below. Do not implement source yet.**
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

## Claude — corrected Phase 0 report

Re-read `TierInstanceSchema.php`, `PackageSchema.php` (occupant slot builder/`ensureTierLifecycle`/`isOccupantFormat`/occupant-bin/Edition/Leg functions), `PackageManagerSchema::resolveCommercialLegTimeline()`, `PackageRepository::findAllActiveFamiliesForCostBuilder()`/`projectTierInstanceForCostBuilder()`, and `quote.ts`, this time tracing exactly which parts of that machinery are hardcoded to the five `ALLOWED_TIERS` slot keys versus generic over "an occupant array" — that distinction is what makes the corrected shape possible without touching `TierAssignmentSchema` at all.

### 1. Where it persists

As one new sibling field on the Tier Instance record itself — alongside `tiers`, `popular_tier`, `occupant_bin` — e.g. `composable_occupant` (nullable single object, not an array, matching "exactly one"). **Not** a sixth entry in `PackageSchema::ALLOWED_TIERS` (`['basic','standard','premium','enterprise','ultimate']`, `PackageSchema.php:26`).

Why this is safe and minimal: `TierInstanceSchema::sanitizeInstance()` builds `tiers[tierId]` by looping `PackageSchema::ALLOWED_TIERS` explicitly (`TierInstanceSchema.php:135`). A new sibling key added next to that loop — sanitized the same way `popular_tier`/`allowed_rate_sheet_ids` already are — is invisible by construction to every consumer that only iterates `tiers` or `ALLOWED_TIERS` (the customer "Choose your Tier" exclusive-select grouping, `ComparePlans.tsx`, `deriveInstanceStatus()`'s per-tier scan) until each one is deliberately taught to also read it. That is the difference between "additive" and "relax an existing rule" the correction asked for: nothing has to *exclude* the composable occupant from the five-slot competition, because it was never inside that collection to begin with.

### 2. Identity

The container field needs **no identity of its own** — rung 1 attribute of the Tier Instance, same status as `popular_tier`. `CZTG` stays exactly where it is today, unchanged.

The one occupant living inside it is a real occupant and reuses `CZT` (never `CZTA`, matching "`is_addon` ... not reused for this") through the same Publish flow every other occupant uses. Its native reference is the existing shape `(tier_instance_id, occupant_id)` — confirmed this needs no new identity family by reading the occupant-shell builder: `'id' => $existingId ?? ('occ_' . bin2hex(random_bytes(4)))` (`PackageSchema.php:1459`) mints `occupant_id` **independent of any slot key** — it is never derived from or scoped by `ALLOWED_TIERS`. `CZT`'s identity contract already accommodates an occupant that doesn't live in `tiers[tierId]`; nothing in `PlatformIdentifierPolicy` or the Package adapter needs to change.

### 3. Reuse of occupant/Edition/Leg/Rate Sheet machinery

Confirmed by reading the transform functions directly: the occupant-shell builder, `ensureTierLifecycle()`, `isOccupantFormat()`, `PackageManagerSchema::resolveCommercialLegTimeline()`, `evaluateTierPricing()`/`projectTierRateSheetWith()`, and every Tier Edition sanitize/transition function all operate on **a slot/occupant array value**, not on a hardcoded `station['tiers'][$tierId]` path. The `ALLOWED_TIERS` coupling lives one layer up, at the call sites (`PackageStationController.php` route params, `TierInstanceSchema::sanitizeInstance()`'s loop) — not inside the engine functions themselves. So the exact same functions can run unmodified against `composable_occupant`'s slot value, invoked from new addressing logic that targets that field instead of `tiers[$tierId]`. Zero change needed inside the pricing/Leg/Edition engines.

One real, small exception found by tracing archive/restore specifically: `PackageSchema::ensureOccupantBin()` validates a bin entry's `origin_tier` against `ALLOWED_TIERS` and silently drops anything else to `''` (`PackageSchema.php:2365-2368`). Archiving/restoring the composable occupant through the unmodified bin needs that whitelist extended with one sentinel value (e.g. `'composable'`) — the smallest possible touch, but not zero, so it should not be assumed "fully free" reuse.

### 4. Public projection

`findAllActiveFamiliesForCostBuilder()` and `projectTierInstanceForCostBuilder()` keep resolving exactly one Tier Instance per Family, unchanged (the correction keeps the singular assignment, so nothing in that resolution path changes at all). Inside that same single-instance projection, add one more explicit read of the new sibling field — projected the same way each `tiers[tierId]` entry already is (occupant_id/platform_id/edition_options extraction, Rate-Sheet-id stripping, `commercial_legs` attach) — and expose it as a new sibling key on the Family row (e.g. `composable_offer`), never merged into `tiers`. Because `PricingTiers.tsx`'s exclusive-select loop and `ComparePlans.tsx` only ever iterate the `tiers` map, they stay completely unaware of the new key without any exclusion logic being written — satisfying "can never replace/compete with them" by the same absence-based guarantee as point 1, not a runtime check.

### 5. Cart/quote treatment

Because the correction forbids a second Tier Instance, `familyTierSystemKey()`'s existing `family:${familyPlatformId}:instance:${tierInstancePlatformId}` stays exactly one key per Family — both the normal Tier and the composable extra share it, the same way a normal Tier and its Add-ons already do. The precedent to follow is the existing `:addon:${tierPlatformId}` suffix (`quote.ts:25`), which already differentiates an add-on line from `:primary` under one shared system key using the add-on occupant's own `CZT`. The smallest addition: one more suffix, `:composable:${tierPlatformId}`, using the composable occupant's own `CZT` — plus one new boolean on `FamilyTierQuoteItem` (e.g. `isComposable`, mirroring the existing `isAddon` field exactly) so `quoteItemKey()` gains one more branch. `is_addon`/`isAddon` itself is not reused or overloaded, matching the correction. No change to `replaceFamilyNormalQuoteItem`'s or `upsertFamilyAddonQuoteItem`'s dedup logic — the new suffix already makes the line's key unique, so the existing filter-by-key pattern just works.

### 6. Files affected and migration risk

**Backend**
- `TierInstanceSchema.php` — `sanitizeInstance()` gains one new sibling field, default `null`, sanitized like `popular_tier`.
- `PackageSchema.php` — new addressing entry points that route to the sibling field instead of `tiers[$tierId]`, reusing the existing occupant-shell/lifecycle functions unmodified; extend `ensureOccupantBin()`'s `origin_tier` whitelist (`PackageSchema.php:2368`) for archive/restore of this occupant.
- `PackageStationController.php` — a distinct route/address form for `(tier_instance_id, 'composable')`, deliberately not reusing the `slotId ∈ ALLOWED_TIERS` validation path (reusing it would either reject the new address or, worse, silently treat it as a sixth `ALLOWED_TIERS` member).
- `PackageRepository.php` — `projectTierInstanceForCostBuilder()`/`findAllActiveFamiliesForCostBuilder()` project the new sibling field alongside `tiers` (point 4).

**Frontend**
- `tierDrawerTypes.ts` — a new address token for the composable occupant, distinct from the existing occupant/empty-slot tokens (both of which are `ALLOWED_TIERS`-keyed today).
- `TierDrawerHost.tsx`, `usePackageStation.ts`, `tierOccupants.ts` — recognize the new container without touching existing slot-decoding logic.
- `quote.ts` — new `isComposable` branch in `quoteItemKey()`/`familyTierSystemKey()`; `FamilyTierQuoteItem` (`cost-builder/types.ts`) gains the field.
- `PricingTiers.tsx` — new presentation branch (Build Your Own / Add Extras) reading the new sibling field, explicitly outside the existing `is_addon`/`!is_addon` split.

**Tests/contracts to extend**: `tier-instance-schema.php`, `tier-instance-public-projection.php`, `tier-occupant-compatibility.php`, `tier-group-composition.php`, `package-family-cart-contract.ts`, `package-family-request-flow-contract.ts`, plus new dedicated coverage for the composable occupant's own lifecycle/bin/cart behavior.

**Migration risk**: none for existing stored stations. The new field is absent/`null` everywhere until explicitly set, the same additive pattern every prior optional occupant field (`is_addon`, `headline_leg_id`, `tier_editions[]`) already used — no backfill script, no `TemporaryMigrationController` entry, no `PlatformIdentifierPolicy` change.

**One open product question, not resolved here**: whether `TierInstanceSchema::deriveInstanceStatus()`/`deriveStationStatusFromInstances()` — which currently derive the instance's Active/Pending status purely from the `ALLOWED_TIERS`-keyed `tiers` map — should ever consider the composable occupant's own status. Leaving them blind to it (Tier Instance activity is defined by its primary Tiers only) is consistent with "subordinate, never superior," but should be an explicit Phase 1 decision rather than an implicit side effect of where the field was added.