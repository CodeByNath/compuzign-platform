# Composable Tier Occupant

**Phase 1B — backend complete.** Persistence, lifecycle, projection,
identity, and full Tier Edition CRUD/lifecycle/bin parity all exist and are
exercised by real controller-level tests. See [Composable Tier Occupant
Admin UI](tier-composable-occupant-admin-ui.md) for the frontend design and
current verification status.

## Purpose and ownership

A Package Family keeps exactly **one** assigned Tier System / Tier Group —
`TierAssignmentSchema`'s invariants are unchanged. The composable occupant
is a **subordinate child of that same Tier Instance**, never a second Tier
System, never a peer of the five [Tiers](tiers.md) slots, never Family-
assigned independently. It is one new sibling field on the Tier Instance,
`composable_occupant` — a single nullable slot, not an array, so "exactly
one occupant" is true by shape. Never added to `PackageSchema::ALLOWED_TIERS`.

Package Station owns it like any Tier Instance field.
`TierInstanceSchema::sanitizeInstance()` defaults it `null`; `is_addon` is
not reused for it.

## Identity

No new Platform ID family. The occupant reuses `CZT` exactly like a
`tiers[tierId]` occupant — native reference `(tier_instance_id,
occupant_id)` is not slot-qualified. Never `is_addon`, so never `CZTA`.
Editions/Legs reuse `CZTE`/`CZTL`/`CZTEL` through dedicated
`.../composable/editions/...` routes (full CRUD/lifecycle/bin parity).

**Identity-adapter gap found and fixed:** `PackageRepository`'s locate/
claim/exists/assignment-page functions for `tierOccupant`, `tierLeg`,
`tierEdition`, `tierEditionLeg` (16 functions) originally scanned only
`instance.tiers[*]`/`instance.occupant_bin[]`. A composable occupant's
native reference matched nothing, so `bind()` threw on first Publish even
though `reserve()`/the station write succeeded — caught only by invoking
the real controller against a real `PlatformIdentifierStation` in
`tests/composable-occupant-controller-contract.php`, not `php -l`. All 16
now also check `instance.composable_occupant.current_occupant` as a
fourth occupant location.

## Reused unchanged

`PackageSchema`'s occupant-shell builder, `ensureTierLifecycle()`,
`ensurePendingOccupant()`, `commitTierLifecycle()`, `settleTierSlot()`,
`revertTierModuleDraft()`, `sanitizeCommercialLegs()`, and the Rate
Sheet/Leg/Edition engines in `PackageManagerSchema` are generic over "an
occupant slot array," not `ALLOWED_TIERS`-hardcoded — all run unmodified
against `composable_occupant`.

## Dedicated (not reused)

- `PackageStationController` `SECTION: COMPOSABLE_OCCUPANT` (module save/
  revert/enable-disable/settle) and `SECTION: COMPOSABLE_OCCUPANT_EDITION`
  (11 methods mirroring `SECTION: TIER_EDITION`/`TIER_EDITION_BIN`) — call
  the same `PackageSchema` functions the `tiers/{tier}/...` routes call,
  addressed at `instance.composable_occupant`. No existing route touched.
- `archiveComposableOccupant()`/`restoreComposableOccupant()` — NOT the
  `ALLOWED_TIERS`-coupled, swap/retarget-capable
  `archiveTierOccupant()`/`restoreBinnedOccupant()` (never valid here — an
  occupied slot blocks with `target_occupied`). `trashBinnedOccupant()`/
  `deleteBinnedOccupant()` are reused unchanged. Bin `origin_tier` uses
  sentinel `COMPOSABLE_OCCUPANT_ORIGIN` (distinct from the frontend's own
  `COMPOSABLE_TIER_ID` — one addresses the live slot, the other labels a
  displaced bin entry), accepted alongside (never joining) `ALLOWED_TIERS`.
- `compileOccupantSlotForCostBuilder()`/`enrichCompiledOccupantIdentity()`/
  `compileAdminOccupantDetail()` — extracted from the per-tier loops so
  `tiers[tierId]` and the composable child compile through one shared
  function each, attached as sibling key `composable_offer`/
  `composable_occupant`, never merged into `tiers`.
  `PackageFamilyPricingBuilder::presentOccupant()` — same extraction
  publicly, appearing only when fully identified (real `CZT`).

## Not yet built

Customer-facing selection UI, cart key (`FamilyTierQuoteItem`), quote
snapshot, PDF/email, promotions — see [Composable Tier Occupant — Customer
Configuration Policy](tier-composable-occupant-customer-policy.md) (Phase 2A)
for the backend policy/resolver slice that now exists ahead of these.
`TierInstanceSchema::deriveInstanceStatus()` never reads
`composable_occupant` — it can never make the parent Tier Instance Active.

## Related Code Maps

[Composable Tier Occupant Admin UI](tier-composable-occupant-admin-ui.md),
[Composable Tier Occupant — Tier Workspace UI](tier-composable-occupant-workspace-ui.md),
[Composable Tier Occupant — Customer Configuration
Policy](tier-composable-occupant-customer-policy.md), [Tiers](tiers.md),
[Tier Add-on Selection](tier-addon.md), [Tier Edition](tier-edition.md),
[Commercial Legs](commercial-legs.md), [Package Station](package-station.md),
and [Cost Builder](cost-builder.md).
