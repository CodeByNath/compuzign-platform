# Domain Ownership Map

Who is allowed to decide what, for the Package/Tier/Rate Sheet/Commercial
Legs subsystem this Skill was extracted from. When auditing a new
subsystem outside this one, build the equivalent table before proposing
anything — the columns (identity infra, pricing, orchestration/lifecycle,
persistence/projection, presentation) are the general shape to reuse.

## Identity infrastructure

`src/PlatformIdentifier/PlatformIdentifierStation.php` +
`PlatformIdentifierPolicy.php` — mints, validates, reserves, binds,
tombstones, and enumerates. Owns **no** native entity, lifecycle,
validation, draft, projection, pricing, or relationship data. Domain code
supplies scalar read/write and bounded-enumeration callbacks through a
`PackagePlatformIdentifierAdapter`; the engine itself never branches on
domain storage. Extending identity support means adding one entry to
`PlatformIdentifierPolicy::PREFIXES` and wiring the owning domain's own
adapter — never teaching the engine about a new domain shape.

`TemporaryMigrationController.php` (`admin/platform-identifiers/migration`,
dry-run → assign) is the one existing batch repair mechanism, built on
the same reserve/claim/bind primitives. New identity families extend its
`ENTITY_TYPES` list and `adapterFor()` match arm — they do not get a new
controller, script, or CLI command of their own.

## Pricing

`PackageManagerSchema.php` (`projectTierRateSheetWith()`/
`evaluateTierPricing()`) is the one price engine. Rate Sheet rows
(`CZPRCI`) are the only atomic price source — nothing above them
recomputes or duplicates a price; every higher layer (Bundle pricing,
Tier pricing, Commercial Leg component pricing) re-calls this same
engine over a selected bucket of rows, never a second parallel
calculation.

## Orchestration / lifecycle

`PackageSchema.php` (module draft/settle/revert, the shared
`StationLifecycle` engine) and `PackageStationController.php` (REST
mutation boundary) own when a Tier occupant/Edition transitions state,
and when identity is actually reserved — always at a settle/mutation
boundary (e.g. `reserveTierLegPlatformIds()` inside
`settlePackageStationTier()`), never on a read path.

## Persistence / projection

`PackageRepository.php` owns `cz_package_station` storage and is the one
Cost Builder read boundary (`projectTierInstanceForCostBuilder()`). Any
field a public/admin consumer needs must be explicitly carried through
this layer's own extraction functions (e.g.
`PackageSchema::extractTierForCostBuilder()`) — an upstream identity that
exists in storage is not automatically visible downstream; it must be
named at every extraction step in between.

## Presentation

Frontend editors/read-models (`TierPricingRulesEditor.tsx`,
`TierEditionOverviewFields.tsx`, `CommercialLegsDebugPanel.tsx`, etc.)
never own identity or pricing. They mirror backend-computed values
(e.g. capping manual entry at the same commitment value the backend
enforces) and read through draft-preferred projections — they do not
invent independent business rules the backend doesn't already enforce.

## Applying this elsewhere in CompuZign

Before proposing a new entity anywhere in the platform, name the current
owner in each of these five columns for the area you're touching. If you
cannot name an owner, that is the first thing to resolve — not evidence
that a new layer is needed. A new layer is only justified once you've
confirmed no existing owner already covers the responsibility.
