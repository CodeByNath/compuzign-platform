# Composable Tier Occupant

**Phase 1A — backend/hook complete, admin UI not mounted.** Persistence,
lifecycle, projection, identity, full Tier Edition CRUD/lifecycle/bin
parity, and a typed `usePackageStation` hook (view + mutations) all exist
and are exercised by real controller-level tests. No admin drawer screen
renders any of it — `composableView()`/`saveComposableOverview()` etc. are
ready for a future round to mount. No customer-facing inclusion/quantity/
Price Option selection, cart key, quote snapshot, or promotion exists. Do
not describe this as customer- or admin-reachable yet.

## Purpose and ownership

A Package Family keeps exactly **one** assigned Tier System / Tier Group —
`TierAssignmentSchema`'s invariants are unchanged. The composable occupant
is a **subordinate child of that same Tier Instance**, never a second Tier
System, never a peer of the five [Tiers](tiers.md) slots, never Family-
assigned independently. It is one new sibling field on the Tier Instance,
`composable_occupant` — a single nullable slot, not an array, so "exactly
one occupant" is true by shape. Never added to `PackageSchema::ALLOWED_TIERS`.

Package Station owns it like any other Tier Instance field.
`TierInstanceSchema::sanitizeInstance()` defaults it `null`; `is_addon` is
not reused for it (an Add-on stays a `tiers[tierId]` occupant).

## Identity

No new Platform ID family. The occupant reuses `CZT` exactly like a
`tiers[tierId]` occupant — native reference `(tier_instance_id,
occupant_id)` is not slot-qualified. Never `is_addon`, so never `CZTA`.
Editions/Legs reuse `CZTE`/`CZTL`/`CZTEL` through dedicated
`.../composable/editions/...` routes (full CRUD/lifecycle/bin parity).

**Identity-adapter gap found and fixed during completion:**
`PackageRepository`'s locate/claim/exists/assignment-page functions for
`tierOccupant`, `tierLeg`, `tierEdition`, and `tierEditionLeg` (16 functions
total) originally scanned only `instance.tiers[*]` and `instance.
occupant_bin[]`. A composable occupant's native reference matched nothing,
so `settleComposableOccupant()`'s `bind()` threw on first Publish even
though `reserve()` and the station write succeeded — caught only by
invoking the real controller against a real `PlatformIdentifierStation` in
`tests/composable-occupant-controller-contract.php`, not by `php -l` or a
pure-function test. All 16 now also check
`instance.composable_occupant.current_occupant` as a fourth occupant
location alongside the five `tiers` slots and `occupant_bin`.

## Reused unchanged

`PackageSchema`'s occupant-shell builder, `ensureTierLifecycle()`,
`ensurePendingOccupant()`, `commitTierLifecycle()`, `settleTierSlot()`,
`revertTierModuleDraft()`, `sanitizeCommercialLegs()`, and the Rate
Sheet/Leg/Edition engines in `PackageManagerSchema` are generic over "an
occupant slot array," not `ALLOWED_TIERS`-hardcoded — all run unmodified
against `composable_occupant`.

## Dedicated (not reused)

- `PackageStationController` `SECTION: COMPOSABLE_OCCUPANT` — module save/
  revert/enable-disable/settle, plus `SECTION: COMPOSABLE_OCCUPANT_EDITION`
  (11 methods, mirroring `SECTION: TIER_EDITION`/`TIER_EDITION_BIN`) — all
  calling the same `PackageSchema` functions the `tiers/{tier}/...` routes
  call, addressed at `instance.composable_occupant`. No existing tier or
  Edition route/method is touched.
- `PackageSchema::archiveComposableOccupant()`/`restoreComposableOccupant()`
  — dedicated, NOT the `ALLOWED_TIERS`-coupled `archiveTierOccupant()`/
  `restoreBinnedOccupant()` (which support swap/retarget across the five
  peer slots — never valid here; an occupied slot blocks with
  `target_occupied`). `trashBinnedOccupant()`/`deleteBinnedOccupant()` are
  reused unchanged. Bin `origin_tier` uses sentinel
  `PackageSchema::COMPOSABLE_OCCUPANT_ORIGIN`, accepted by
  `ensureOccupantBin()`'s whitelist alongside (never joining) `ALLOWED_TIERS`.
- `PackageRepository::compileOccupantSlotForCostBuilder()`/
  `enrichCompiledOccupantIdentity()` and
  `PackageStationController::compileAdminOccupantDetail()` — extracted from
  the per-tier loops so `tiers[tierId]` and the composable child compile
  through one shared function each, attached as sibling key
  `composable_offer`/`composable_occupant`, never merged into `tiers`.
  `PackageFamilyPricingBuilder::presentOccupant()` — same extraction
  publicly; appears only when configured and fully identified (real `CZT`).
- `usePackageStation.ts` — `buildTierViewFromSlot()` extracted from
  `tierView()` so `composableView()` derives the identical draft-preferred,
  live-priced view from `station.composable_occupant`. Mutation set mirrors
  the tierId-keyed one, minus the key and `setPopularTier`.

## Not yet built

**Admin drawer/launcher UI** — the one remaining Phase 1A item. The hook is
ready; no screen mounts it. `TierDrawerContent.tsx`/`useTierDrawerController.
ts` (the locked, historically bug-prone four-group Tier drawer —
`package-station/CLAUDE.md` documents defects caught only by live browser
validation, not code review) were deliberately not touched without a way to
verify chrome/footer/focused-task-shell behavior interactively. Composable
archive/restore also has no UI affordance yet, though the API exists.

Also not built: customer-facing inclusion/quantity/Price Option selection,
cart key (`FamilyTierQuoteItem`), quote snapshot, PDF/email, promotions.
`TierInstanceSchema::deriveInstanceStatus()` never reads
`composable_occupant` — it can never make the parent Tier Instance Active.

## Related Code Maps

[Tiers](tiers.md), [Tier Add-on Selection](tier-addon.md), [Tier
Edition](tier-edition.md), [Commercial Legs](commercial-legs.md), [Package
Station](package-station.md), and [Cost Builder](cost-builder.md).
