# Composable Tier Occupant

**Phase 1B — backend, hook, and admin UI mount all complete; not yet
browser-verified.** Persistence, lifecycle, projection, identity, Edition
CRUD/lifecycle/bin parity, the `usePackageStation` hook, and a mounted
admin card all exist. Backend is exercised by real controller-level tests;
the UI compiles/builds clean but has not been interactively verified — see
Admin UI below. No customer-facing selection, cart key, quote snapshot, or
promotion exists.

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
against `composable_occupant`. On the frontend, `TierOverviewEditor`,
`TierPricingRulesEditor`, `PoolInclusionsEditor`, `PoolFaqsEditor`, and
`buildRateSheetCatalogue()` are all reused verbatim (not forked) by the
composable card — the first three are pure `{draft, onChange}` components
with no Tier-specific coupling already.

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
  sentinel `COMPOSABLE_OCCUPANT_ORIGIN`, accepted alongside (never joining)
  `ALLOWED_TIERS`.
- `compileOccupantSlotForCostBuilder()`/`enrichCompiledOccupantIdentity()`/
  `compileAdminOccupantDetail()` — extracted from the per-tier loops so
  `tiers[tierId]` and the composable child compile through one shared
  function each, attached as sibling key `composable_offer`/
  `composable_occupant`, never merged into `tiers`.
  `PackageFamilyPricingBuilder::presentOccupant()` — same extraction
  publicly, appearing only when fully identified (real `CZT`).
- `usePackageStation.ts` — `buildTierViewFromSlot()` extracted from
  `tierView()` so `composableView()` derives the same draft-preferred view.
  Mutation set mirrors the tierId-keyed one, minus the key and
  `setPopularTier`.
- `ComposableOccupantCard.tsx` (new) — its own small local `useState` edit
  state, not the tierId-keyed `useTierModuleEditing`/`useTierBinTravel` the
  five normal occupants share — deliberately lighter than the full
  schema-driven module system the individual-tier screen uses.

## Admin UI

Mounted in `TierDrawerContent.tsx`'s package-overview Details screen, as
one additive section after the five `tierOccupants` cards and before the
Pricing Summary table — never inside `TIER_KEYS`/`tierOccupants`, the
"Current (N)" count, the table rows, or individual-tier navigation. Path:
absent → Create (Overview) → Pending identity → Pricing Rules/Features/
FAQs → Publish → Enable/Disable, plus a minimal Editions section (create +
one-click Publish only — no module editing or bin UI for Editions).
`TierOverviewEditor` gained an additive `hideAddonAndPopular` prop
(default `false`, every caller unaffected) so the card reuses it without
the Add-on/popular checkboxes, which do not apply here. No archive/restore
UI yet, though the API exists.

**Not interactively verified.** `TierDrawerContent.tsx`/
`useTierDrawerController.ts` are the locked, historically bug-prone
four-group Tier drawer — `package-station/CLAUDE.md` documents defects
caught only by live browser validation, not code review or `tsc`/`build`.
Authorized to proceed without a live browser this round, with validation
deferred to the reviewer after source review.

## Not yet built

Customer inclusion/quantity/Price Option selection, cart key
(`FamilyTierQuoteItem`), quote snapshot, PDF/email, promotions.
`TierInstanceSchema::deriveInstanceStatus()` never reads
`composable_occupant` — it can never make the parent Tier Instance Active.

## Related Code Maps

[Tiers](tiers.md), [Tier Add-on Selection](tier-addon.md), [Tier
Edition](tier-edition.md), [Commercial Legs](commercial-legs.md), [Package
Station](package-station.md), and [Cost Builder](cost-builder.md).
