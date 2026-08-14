# Surface Packages Boundary

Global policy is defined by [AGENTS.md](../../../../../../AGENTS.md).

## Ownership and entry points

- `SurfacePackagesModule.php` — module wiring.
- `Http/PackageFamiliesController.php` — Package Family lifecycle and relationship routes.
- `Http/PackageStationReadController.php` — authenticated assigned-instance summary rows for admin consumers.
- `Http/PackageStationController.php` — global Tier-instance/assignment collection routes plus explicitly instance-scoped Tier reads, occupant-bin, popular-Tier, Tier Edition mutations, and (Phase 6) the occupant-owned Edition-bin mutations; no unscoped Tier aliases remain.
- `Repositories/PackageRepository.php` — `cz_package_station` persistence, request cache, relationships, Promotions, read-only legacy Tier lift, canonical `saveStation` mutation writes, load bridges that never retire on read, all-instance Rate Sheet usage guards, assignment-resolved Cost Builder indexing, and Tier Edition (`tierEdition*`) identity lookup/claim/projection — scanning both `tier_editions[]` and the occupant-owned `tier_edition_bin[]`.
- Its direct Family customer read follows Family assignment → Tier Instance →
  shared compiled occupants. It must never call the Service resolver. Native
  IDs and existing Platform business identifiers travel together.
- `Support/TierInstanceSchema.php` (Package-owned Tier capability-instance envelope, with no consumer/Family fields), `TierAssignmentSchema.php` (the separate Package Family ↔ Tier Instance usage edge), `PackageManagerSchema.php` (manager shape + the `rate_sheets[]` collection: migration, upsert/delete commit, per-Tier projection), `PackageSchema.php` (occupant compatibility, lifecycle, Tier↔Rate-Sheet binding + clear-on-switch, and — `SECTION: TIER_EDITION` — Tier Edition storage, module draft/settle/revert, engine transitions, parent cascade, and default-Edition resolution; plus — `SECTION: TIER_EDITION_BIN` (Phase 6) — the occupant-owned `tier_edition_bin[]` move/restore/trash/delete, deliberately decoupled from the `/status` endpoint's lifecycle transitions; see [Tier Edition](../../../../../../docs/code-map/tier-edition.md)), `PackageCategoryGroups.php` (Package Family rules, the direct precedent Tier Edition's own lifecycle mirrors), and `PackageStationSchema.php` (only the shared `sanitizeSourceRelationships` and `evaluateTierPricing` helpers — not the aggregate/shape authority).

Package Family now conforms to the locked lifecycle. `Core\Plugin` injects the
shared `PlatformIdentifierStation` through `SurfacePackagesModule`; the Family
row owns `cz_platform_id` and native string `group_id`, while the identifier
Station owns `CZPG` reservation, binding, lookup, conflict, and tombstone only.
Package identity also covers Tier Group `CZTG`, primary Tier `CZT`, secondary
Add-on `CZTA`, Tier Edition `CZTE`, Rate Sheet `CZPRC`, Rate Sheet Group `CZPRCG`, Rate Sheet
Item `CZPRCI`, and Rate Sheet Item Price Option `CZPRCIO`. Tier/Add-on
share one instance-qualified occupant native reference; Tier Edition uses its
own occupant-qualified `(tier_instance_id, occupant_id, edition_id)`
reference. A Price Option is further-qualified by its own row —
`(rate_sheet_id, item_id, option_id)` — reserved/bound/tombstoned through
`PackagePlatformIdentifierAdapters::rateSheetItemOption()`, the same
`rateSheetAdapter($entityType, $scope)` factory `rateSheet()`/`rateSheetGroup()`/
`rateSheetItem()` already use, with `option_id` minted write-path-only in
`PackageManagerSchema::commitConfiguration` (never derived from its label);
it has no dedicated `/admin/...` read route of its own yet, unlike Rate
Sheet/Group/Item. A sheet may additionally hold `bundles[]` — Rate
Sheet-owned composition spaces holding COMPLETE Rate Sheet rows, each Bundle
carrying `CZPRCB` against `(rate_sheet_id, bundle_id)`, each of its rows
`CZPRCBI` against `(rate_sheet_id, bundle_id, item_id)`, and each of those
rows' price options `CZPRCBIO` — separate records from the sheet's own row for
the same supplied content, never references to it. A Bundle stores no groups
and no unit vocabulary: its rows validate against the owning sheet's, and its
`bundle_id` is minted write-path-only in `commitConfiguration` like a sheet id.
A Bundle row additionally carries its own editable `label` (blank inherits the
resolved supplied-content label). A Bundle carries its OWN commercial price
(`unit_price`/`per`/`price_options[]`, the latter `CZPRCBO`) for consuming that
combination together, independent of what its component rows sum to. Upstream it
IS one Rate Sheet row: `consumableRateSheetRows()` offers the sheet's own rows
plus one row per active Bundle (`deriveBundleRowId`, ordinary `rate_` grammar,
`includes[]` for presentation only), placed by `buildReadModel` straight into the
sheet's own `items` — the rows every consumer already reads, so there is no new
field and no consumer changes. The Tool cannot round-trip it: it carries no
`source_item_id`, which `toEditorRows()`/`sanitizeRateRows()` already drop. Component rows are ingredients, not separately chargeable
rows, so they are absent from that offer. NO consumer learns Bundles exist: Tier
storage and selection stay `{ item_id, quantity, price_option_id }` with no
Bundle-shaped storage, addressing, dedup, or pricing path — `PackageSchema` is
untouched. Component-row identity uses `deriveBundleRateItemId` so it never
collides with the sheet's own row for the same supplied content. See
[Rate Sheet Bundle](../../../../../../docs/code-map/rate-sheet-bundle.md).
Package adapters own
storage/enumeration/projection callbacks and delegate registry work to the
shared Station. Owner-specific read routes and durable CLI selectors exist for
all five scopes existing before it. Promotion `CZTP` remains deferred.

## Boundaries

Service-scoped URLs use Service only as navigation context; canonical Tier reads/mutations include `tier-instances/{instance}` before slot/bin resolution. The assignment ledger and Tier-instance collection use global Package-owned routes. This module retains Package persistence. `occupant_id` is stable projection/UI identity, while `(tier_instance_id, slotId)` is the mutation/storage address. Tier Edition is a further-nested child of the occupant, addressed by `(tier_instance_id, slotId, editionId)` at the route layer but identified by `(tier_instance_id, occupant_id, editionId)` for Platform ID purposes — never folded into `PackageSchema::TIER_MODULES`. Tier pool writes go through `Service\Support\ServicePools`; do not touch Service pool meta directly or import `ServiceController`. Promotions persist through `PackageRepository` but their routes belong to `Modules/Promotions`.

Read [Package Manager](../../../../../../docs/code-map/package-manager.md), [Rate Sheet](../../../../../../docs/code-map/rate-sheet.md), [Tiers](../../../../../../docs/code-map/tiers.md), [Tier Capability](../../../../../../docs/code-map/tier-capability.md), [Tier Add-on Selection](../../../../../../docs/code-map/tier-addon.md), [Tier Edition](../../../../../../docs/code-map/tier-edition.md), and [Promotions](../../../../../../docs/code-map/promotions.md).

## Maintenance

`tools/repair-legacy-contact-override.php` is a **one-time historical
reconciliation**, not a general `contact` repair and not part of runtime
behaviour. The pre-Rate-Sheet, Service-hosted station published unpriced Tiers
by setting `contact => true`; `PackageRepository::migrateFromLegacyServiceMeta()`
copied that station into the option raw, `TierInstanceSchema::liftLegacyStation()`
copied `tiers` verbatim into `ti_primary`, and every later write preserved the
value through `??` fallbacks (`PackageSchema::buildOccupantSlot`,
`PackageSchema::settleTierSlot`). Because
`PackageStationSchema::evaluateTierPricing()` tests `$contact` before
completeness, the inherited flag nulled the public total even where the
occupant's own Rate Sheet binding resolved fully.

The tool clears that flag only for occupants in the migrated
`TierInstanceSchema::PRIMARY_INSTANCE_ID` instance whose own binding already
resolves to a complete numeric total, and assigns only
`current_occupant.contact` plus an already-existing Overview draft's own
`contact` key. "Complete price + `contact`" is deliberately **not** treated as
a platform-wide invariant — an administrator may legitimately run internal
calculated pricing behind a contact-only sales model — so it is used solely as
this migration's historical fingerprint.

It does **not** apply to natively-created Tier Instances, `tier_editions[]`,
`tier_edition_bin`, or `occupant_bin[]`, and changes no pricing, Rate Sheet,
Tier/Edition lifecycle, `contact` semantics, or migration behaviour. Dry run by
default; `apply` persists through `PackageRepository::saveStation()`. Boundaries
are locked by `php tests/legacy-contact-override-repair.php`.

## Validation

From the plugin root: `php tests/package-manager-schema.php`, `php tests/package-category-groups.php`, `php tests/active-package-contract.php`, `php tests/tier-occupant-compatibility.php`, `php tests/tier-occupant-is-addon.php`, `php tests/tier-addon-end-to-end.php`, `php tests/tier-pricing-parity.php`, `php tests/legacy-contact-override-repair.php`, `php tests/tier-group-composition.php`, `php tests/tier-group-platform-identity-backfill.php`, `php tests/tier-instance-schema.php`, `php tests/tier-instance-update.php`, `php tests/tier-instance-migration.php`, `php tests/tier-assignment-schema.php`, `php tests/tier-assignment-family-flow.php`, `php tests/tier-instance-mutations.php`, `php tests/tier-instance-guards.php`, `php tests/package-capability-peer-isolation.php`, `php tests/tier-instance-public-projection.php`, `php tests/tier-public-projection-is-addon.php`, `php tests/tier-capability-invariants.php`, `php tests/tier-occupant-platform-identity.php`, `php tests/rate-sheet-platform-identity-reconciliation.php`, `php tests/rate-sheet-bundle.php`, `php tests/tier-edition-schema.php`, `php tests/tier-edition-repository.php`, `php tests/tier-edition-lifecycle.php`, `php tests/tier-edition-cascade.php`, `php tests/tier-edition-default-resolution.php`, `php tests/tier-edition-public-projection.php`, `php tests/tier-edition-bin.php`, `php tests/tier-edition-move-to-bin.php`, `php tests/tier-edition-price-projection.php`, `php tests/tier-rate-sheet-price-option.php`, `php tests/request-schema-minimum-term.php`, `npm run contract:package-family-capability`, `npm run contract:tier-instance-scope`, `npm run contract:tier-overview-is-addon`, `npm run contract:tier-edition-admin`, `npm run contract:tier-edition-switch`, `npm run contract:tier-edition-move-to-bin`, `npm run contract:rate-sheet-price-option-selection`, `npx tsc --noEmit`, and `npm run docs:check`.
