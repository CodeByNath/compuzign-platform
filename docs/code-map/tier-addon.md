# Tier Add-on Selection

## Purpose and ownership

`is_addon` is an occupant-level presentation and selection-behaviour flag, owned by Package Station alongside every other occupant field in [Tiers](tiers.md). It does not change occupant identity, lifecycle, Rate Sheet ownership, Tier Instance assignment, or the five-shell invariant. A Tier System offers the customer one normal Tier (`is_addon: false`) plus zero or more add-on Tiers (`is_addon: true`) from that **same** Tier System, where add-on compatibility is implicit — there is no compatibility ledger, cross-Tier-Instance resolution, or second occupant collection.

The role has permanent secondary identity `tier_addon/CZTA` on that same
occupant, sharing primary `tier/CZT`'s instance-qualified native reference.
Draft Save never assigns it; first successful add-on settlement assigns it
once; normal-Tier settlement preserves it dormant; returning to Add-on reuses
it. No separate Add-on lifecycle, drawer, endpoint family, or native record
exists.

## Locked architecture conformance

Tier Add-on conforms through the exact same locked occupant architecture:

```text
the same Tier occupant
+ is_addon = true
+ optional dormant CZTA identity
```

It therefore uses the same drawer composition and shell, module placement,
inline editors, Save-as-draft boundary, Pending dim/full pills, notification
engine, same-mounted first-Save identity handoff, Publish
settlement/activation, Disable/Enable transitions, lifecycle footer, and
occupant-owned state described in [Tiers](tiers.md). First Overview Save creates
the durable Pending occupant and assigns neither `CZT` nor `CZTA`; first Add-on
Publish assigns both. It must not be modelled as a separate drawer, entity
lifecycle, controller, footer, endpoint family, or Tier Group lifecycle.

## Backend

- [PackageSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php) — `is_addon` lives on `current_occupant`, defaulting `false`, threaded through `upsertOccupant`, `normaliseTierSlot`, `summariseTierSlot`, and `extractTierForCostBuilder`. `settleTierSlot` draft-prefers it (`$ov['is_addon'] ?? $occ['is_addon']`) exactly like `label`. The archive/restore/trash/delete occupant paths never write it — they copy the whole stored record, so it survives archive, restore, retarget, and swap for free.
- [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) — `savePackageStationTierModule`'s `overview` branch accepts `is_addon` in the draft body. No new endpoint exists for this field; it rides the existing Overview module save/settle/revert flow.
- [PricingBuilder.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Services/PricingBuilder.php) — `normalizePricing` defaults every canonical/legacy tier to `is_addon: false`; `overlayPackage` copies the occupant's own value onto every Tier shell that survives its existing enabled/configured checks. A disabled or archived add-on is suppressed by those same checks, exactly like a normal Tier — no add-on-specific visibility rule exists.

## Frontend

- [types.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/types.ts) / [cost-builder.ts](../../wp-content/plugins/compuzign-platform/resources/ts/api/types/cost-builder.ts) — `SurfaceTierDetail`, `SurfaceTierSummary`, `TierOverviewDraft`, and the public `PricingTierData` all carry `is_addon`.
- [TierOverviewEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/editors/TierOverviewEditor.tsx) — the "Make this Tier an add-on" checkbox, beside the popular-Tier control, following the `AdminField` checkbox contract.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) — `draftPreferredDetail` (exported for contract tests) merges a pending `is_addon` draft over the settled occupant, like every other Overview scalar.
- [PricingTiers.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/cost-builder/PricingTiers.tsx) — splits the one projected Tier map into "Choose your Tier" (`!is_addon`, existing single-select `TierCard`) and the **Recommendations** area's "Optional add-ons" group (`is_addon`, independent toggle), sharing one `TierCard` renderer so the visual language, CSS, and theming are defined once. Recommendations is the extensible container for anything offered alongside the Tier, rendering nothing when empty; `recommendationsAside` places it as the strip's trailing card, changing no add-on behaviour. [ServiceCard.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/cost-builder/ServiceCard.tsx) owns `handleSelect` (normal, exclusive) and `handleToggleAddon` (independent); an add-on can never replace the normal selection. [ComparePlans.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/cost-builder/ComparePlans.tsx) excludes add-on Tiers from its comparison columns.

### Admin presentation

The admin engine reads the same occupant. [tierOccupantCard.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/tierOccupantCard.ts) labels its kind. [projection.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/projection.ts) carries `isAddon`/`isPopular` and filters all/Tiers/Add-ons for [TierNavigation.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierNavigation.tsx). [TierDetailPanel.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierDetailPanel.tsx) and [tier.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/schema/bindings/tier.tsx) present Popular and Type.

## Quote cart identity

[quote.ts](../../wp-content/plugins/compuzign-platform/resources/ts/utils/quote.ts) owns cart identity and mutation. Normal lines use `serviceId:primary`; Add-ons use `serviceId:addon:tierId`. Normal replacement preserves Add-ons; Add-on upsert/removal is independent; whole-Service removal removes all lines; classification supplies the shared main/bundle/Add-on split.

[RequestSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/Requests/Support/RequestSchema.php) sanitises `isAddon` to a strict boolean, defaulting `false`.

## Invariants

- Every existing occupant defaults `is_addon: false`; no stored-data migration is required.
- `is_addon` never changes `platform_status`, module `module_status`, occupant id, or Rate Sheet selections.
- No compatibility ledger, cross-Tier-Instance resolution, sixth shell, or second occupant collection exists for this capability.
- The legacy recommended bundle is unrelated; real Add-ons never use its synthetic negative Service identity.
- An Add-on occupant may also carry `tier_editions[]` automatically — it is the same occupant engine, with no Add-on-specific Edition schema, routes, lifecycle, projection, or pricing. See [Tier Edition](tier-edition.md).

## Related Code Maps

[Tiers](tiers.md), [Tier Edition](tier-edition.md), [Cost Builder](cost-builder.md), and [Quote Builder](quote-builder.md).
