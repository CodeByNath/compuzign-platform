# Composable Tier Occupant

**Phase 1A — foundation only.** Backend persistence/lifecycle/projection and
a typed API client exist; no admin drawer UI is wired to it yet, and no
customer-facing inclusion/quantity/Price Option selection, cart key, quote
snapshot, or promotion exists. Do not describe this as customer-reachable.

## Purpose and ownership

A Package Family keeps exactly **one** assigned Tier System / Tier Group —
`TierAssignmentSchema`'s existing invariants are completely unchanged. The
composable occupant is a **subordinate child of that same Tier Instance**,
never a second Tier System, never a peer of the five [Tiers](tiers.md)
slots, and never Family-assigned independently. It is stored as one new
sibling field on the Tier Instance record, `composable_occupant` — a single
nullable occupant slot, not an array, so "exactly one occupant" is true by
shape rather than a runtime check. It is never added to
`PackageSchema::ALLOWED_TIERS`.

Package Station owns it, exactly like every other Tier Instance field.
`TierInstanceSchema::sanitizeInstance()` defaults it to `null`; `is_addon`
semantics are not reused for it (an Add-on is still a `tiers[tierId]`
occupant with `is_addon: true` — orthogonal and untouched).

## Identity

No new Platform ID family. The occupant inside reuses `CZT` exactly like any
`tiers[tierId]` occupant: native reference `(tier_instance_id, occupant_id)`
is not slot-qualified, and `occupant_id` is minted independent of any slot
key. It is never marked `is_addon`, so it never receives `CZTA`. Its
Editions/Legs would reuse `CZTE`/`CZTL`/`CZTEL` identically, though no
dedicated Edition CRUD route exists for it yet (Phase 1A scope).

## Reused unchanged

`PackageSchema`'s occupant-shell builder, `ensureTierLifecycle()`,
`ensurePendingOccupant()`, `commitTierLifecycle()`, `settleTierSlot()`,
`revertTierModuleDraft()`, `sanitizeCommercialLegs()`, and the Rate
Sheet/Commercial Leg/Edition engines in `PackageManagerSchema` are all
generic over "an occupant slot array," not hardcoded to `ALLOWED_TIERS` —
every one of them runs unmodified against `composable_occupant`.

## Dedicated (not reused)

- `PackageStationController` — a parallel set of methods
  (`saveComposableOccupantModule`, `revertComposableOccupantModule`,
  `setComposableOccupantEnabled`, `settleComposableOccupant`) under
  `.../tier-instances/{instance}/composable/...` routes, calling the exact
  same `PackageSchema` functions the `tiers/{tier}/...` routes call, just
  addressed at `instance.composable_occupant`. No existing tier-scoped route
  or method is touched.
- `PackageSchema::archiveComposableOccupant()` /
  `restoreComposableOccupant()` — dedicated, NOT the ALLOWED_TIERS-coupled
  `archiveTierOccupant()`/`restoreBinnedOccupant()`, which support
  swap/retarget across the five peer slots. A composable occupant must never
  be swappable into/out of a normal Tier slot, so restore supports no
  mode/target — an occupied slot simply blocks with `target_occupied`.
  `trashBinnedOccupant()`/`deleteBinnedOccupant()` ARE reused unchanged
  (already generic over any bin entry by `bin_id`). The bin entry's
  `origin_tier` uses sentinel `PackageSchema::COMPOSABLE_OCCUPANT_ORIGIN`,
  accepted by `ensureOccupantBin()`'s whitelist alongside `ALLOWED_TIERS`
  without joining it.
- `PackageRepository::compileOccupantSlotForCostBuilder()` /
  `enrichCompiledOccupantIdentity()` — extracted from the existing per-tier
  loops in `projectTierInstanceForCostBuilder()`/
  `findAllActiveFamiliesForCostBuilder()` so both a `tiers[tierId]` entry
  and the composable child compile through one shared function, attached as
  sibling key `composable_offer`, never merged into `tiers`.
  `PackageFamilyPricingBuilder::presentOccupant()` — same extraction on the
  public customer-response side; `pricing.composable_offer` only appears
  when configured and fully identified (real `CZT`).
- `PackageStationController::compileAdminOccupantDetail()` — same
  extraction for the admin read (`getPackageStation()`), returned as
  `station.composable_occupant`.

## Not yet built (Phase 1A explicitly excludes)

Admin drawer/launcher UI, Tier Edition CRUD routes for this occupant,
customer-facing inclusion/quantity/Price Option selection, cart key
(`FamilyTierQuoteItem`) changes, quote-time snapshot, PDF/email, and
promotions. `TierInstanceSchema::deriveInstanceStatus()` deliberately never
reads `composable_occupant` — this child can never make its parent Tier
Instance Active on its own.

## Related Code Maps

[Tiers](tiers.md), [Tier Add-on Selection](tier-addon.md), [Tier
Edition](tier-edition.md), [Commercial Legs](commercial-legs.md), [Package
Station](package-station.md), and [Cost Builder](cost-builder.md).
