# Platform Identifier Station

## Purpose and boundary

`PlatformIdentifierStation` is backend infrastructure for permanent, globally
unique identity. It owns identifier policy, secure generation, atomic
reservation, immutable binding, forward/reverse lookup, deletion tombstones,
conflict detection, and bounded existing-record assignment.

It owns no native entity, lifecycle, validation, draft, projection, pricing,
relationship, drawer, or domain action. Owners supply scalar identity
read/write and bounded enumeration callbacks. It is not the frontend Station
Manager and must never be registered there.

## Authoritative files

- `src/PlatformIdentifier/PlatformIdentifierStation.php` — engine and minimal
  non-autoloaded WordPress Option registry.
- `src/PlatformIdentifier/PlatformIdentifierPolicy.php` — closed entity types,
  prefixes, alphabet, suffix length, and validation.
- `src/PlatformIdentifier/PlatformIdentifier.php` and
  `PlatformIdentifierReservation.php` — validated candidate/reservation values.
- `src/PlatformIdentifier/PlatformIdentifierBinding.php` and
  `PlatformIdentifierBatchResult.php` — lookup and bounded-assignment results.
- `src/PlatformIdentifier/PlatformIdentifierConflict.php` — fail-closed
  contract failures.
- `src/PlatformIdentifier/ExistingRecordAssignmentCommand.php` — bounded
  Service, Category, and Package Family WP-CLI backfill orchestration.
- `src/PlatformIdentifier/TemporaryMigrationController.php` — temporary
  authenticated live dry-check/batch surface; remove after verified completion.
- `tests/platform-identifier-station.php` and
  `tests/platform-identifier-existing-assignment.php` — engine and backfill contracts.
- `wp-content/plugins/compuzign-platform/scripts/platform-identity-schema-contract.ts`
  — frontend identity schema, plus the vocabulary lock below.
- `docs/platform-identifier-roadmap.md` — phased integration state.

## Vocabulary lock

`PlatformIdentifierPolicy` is the only place a prefix is defined. Frontend
sources, contracts, and Code Maps consume that vocabulary and never coin one:
naming a prefix asserts an entity the engine can mint, resolve, and tombstone.

`npm run contract:platform-identity-schema` reads the prefixes, alphabet, and
suffix length from the policy and scans `resources/ts`, `scripts`, and `docs`. A
token must be exactly a canonical prefix, or one plus a full-length suffix from
that alphabet — `startsWith` would not do, since appending a letter to a real
prefix yields a coined one hiding behind it. Widening the policy is the only way
to widen what downstream files may say. A bare `CZ` is not a claim.

## Registry contract

Forward options are `cz_platform_identifier_v1_{platformId}`. Reverse options
are `cz_platform_identifier_native_v1_{entityType}_{typed-reference-hash}`.
Every option is non-autoloaded. Records carry version, Platform ID, entity type,
native reference, `reserved|bound|retired|deleted` status, and timestamps.
Reservations and tombstones are never reused.

The shared scalar entity key is `cz_platform_id`, though each owning domain
controls its own persistence. `int|string` native references support both
WordPress-native and owner-defined stored identities.

## Current integration status

`Core\Plugin` constructs one Station and injects it through `ServiceModule` and
`AdminModule`. Service owns `CZS` post meta; Category owns atomic
`cz_platform_id` term-meta claims, both `CZC` creation paths, projection,
immutable request rejection, and guarded hard deletion. Phase 3A adds
authenticated reads at `GET /admin/services/{platformId}` and
`/admin/categories/{platformId}`. Each resolves here, rejects
non-bound/conflicting/wrong-entity bindings, then calls its owner's projection
by native numeric ID. Native `idOf` remains unchanged.

Phase 3B registers
`wp compuzign platform-identifiers assign <service|category>` when WP-CLI is
active. `--limit` defaults to 100, capped at 500; `--cursor` defaults to zero.
It returns bounded progress and the next cursor.

During Package rollout, Admin refresh runs zero-write preflights per entity.
Assignment processes 100-record Package-owned string-cursor batches through
`assignExistingBatch()`, guarded by a 45-second atomic lock. Invalid, duplicate,
or conflicting bindings stop assignment; valid IDs are preserved. Completion
hides the notice. The controller remains only until live allocation is verified.

Package Phase 4 began with Package Families. `Core\Plugin` injects the
shared Station through `SurfacePackagesModule`; Package owns `cz_platform_id`
in its `category_groups[]` row and string native `group_id`. Creation reserves
`CZPG`, persists the Pending Family, binds the returned native identity,
projects output-only identity, rejects mutation, and tombstones guarded hard
deletion. The read at `/admin/package-families/{platformId}` resolves only a
bound matching Family before delegating to Package projection. The same WP-CLI
command accepts `package-family`, using bounded lexically sorted `group_id`
pages and Package-owned immutable scalar callbacks.

Package identity covers Tier Group (`CZTG`), Tier (`CZT`), Tier Add-on
(`CZTA`), Tier Edition (`CZTE`), Rate Sheet (`CZPRC`), Rate Sheet Group
(`CZPRCG`), Rate Sheet Item (`CZPRCI`), Price Option (`CZPRCIO`), and
[Rate Sheet Bundle](rate-sheet-bundle.md)'s Bundle definition `CZPRCB`, compiled
Bundle Item `CZPRCBI`, and included-row relationship `CZPRCBII`. Bundle
commercial rows retain ordinary `CZPRCI`/`CZPRCIO`. The older
`CZPRCBO`/`CZPRCBIO` entity types remain policy-readable only so persisted
bindings can be migrated and tombstoned; new writes must not mint them.
Tier/Add-on share one instance-qualified occupant reference; Tier Edition's
reference is occupant- not slot-qualified — see
[Tier Edition](tier-edition.md). Rate Sheet Group/Item/Option use
`(rate_sheet_id, group_id)`/`(rate_sheet_id, item_id)`/
`(rate_sheet_id, item_id, option_id)`; Bundle scopes qualify by `bundle_id`. Package adapters retain
storage/projection ownership and delegate registry work here. Tier
Promotion (`CZTP`) is deferred.
