# Platform Identifier Station

## Purpose and boundary

`PlatformIdentifierStation` is backend infrastructure for permanent, globally
unique identity: policy, secure generation, atomic reservation, immutable
binding, forward/reverse lookup, deletion tombstones, conflict detection,
and bounded existing-record assignment.

It owns no native entity, lifecycle, validation, draft, projection, pricing,
relationship, drawer, or domain action. Owners supply scalar identity
read/write and bounded enumeration callbacks. It is not the frontend Station
Manager and must never register there.

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
- `tests/request-durable-submission.php` — Request/`CZR` reserve/assign/
  rollback and the creation lock's CAS takeover.
- `wp-content/plugins/compuzign-platform/scripts/platform-identity-schema-contract.ts`
  — frontend identity schema, plus the vocabulary lock below.
- `docs/platform-identifier-roadmap.md` — phased integration state.

## Vocabulary lock

`PlatformIdentifierPolicy` is the only place a prefix is defined. Frontend
sources, contracts, and Code Maps consume that vocabulary and never coin one:
naming a prefix asserts an entity the engine can mint, resolve, and tombstone.

`npm run contract:platform-identity-schema` reads the prefixes, alphabet, and
suffix length from the policy and scans `resources/ts`, `scripts`, and `docs`.
A token must be exactly a canonical prefix, or one plus a full-length suffix
— `startsWith` would not do, since a letter appended to a real prefix yields
a coined one hiding behind it. A bare `CZ` is not a claim.

## Registry contract

Forward options are `cz_platform_identifier_v1_{platformId}`. Reverse options
are `cz_platform_identifier_native_v1_{entityType}_{typed-reference-hash}`.
Every option is non-autoloaded. Records carry version, Platform ID, entity
type, native reference, `reserved|bound|retired|deleted` status, and
timestamps. Reservations and tombstones are never deleted or reused.

The shared scalar entity key is `cz_platform_id`; each owning domain
controls its own persistence. `int|string` native references support
WordPress-native and owner-defined stored identities.

## Current integration status

`Core\Plugin` constructs one Station. Phase 2 injects it through `ServiceModule`;
Service owns `cz_platform_id` post meta and `CZS` integration. Phase 3 injects
the same instance through `AdminModule`; Category owns atomic
`cz_platform_id` term-meta claims, both `CZC` creation paths, projection,
immutable request rejection, and guarded hard deletion. Phase 3A adds
authenticated reads that resolve here, reject non-bound/conflicting/
wrong-entity bindings, then call the owner's projection by native numeric
ID. The drawer schema carries optional `platformIdOf`; native `idOf` is
unchanged.

Phase 3B registers a WP-CLI backfill command for Service/Category, returning
processed/assigned/preserved/conflict counts, completion, and the next cursor.

During the final temporary Package entity rollout, Admin refresh reads
independent v4 progress and runs zero-write preflights for nine Package
scopes — `TIER_LEG`/`TIER_EDITION_LEG` (Commercial Legs) reuse their
live-reservation adapters; no separate backfill tool exists. Assignment
processes 100-record Package-owned string-cursor batches through
`assignExistingBatch()`, guarded by a 45-second lock. Invalid, duplicate, or
conflicting bindings stop assignment; valid IDs are preserved. The controller
remains only until live allocation is verified.

Package Phase 4 began with Package Families: `Core\Plugin` injects the
shared Station through `SurfacePackagesModule`; Package owns `cz_platform_id`
in its `category_groups[]` row and string `group_id`. Creation reserves
`CZPG`, persists the Pending Family, binds native identity, projects
output-only, rejects mutation, tombstones hard deletion. The same WP-CLI
command accepts `package-family` with bounded lexically sorted pages.

Package identity covers Tier Group (`CZTG`), Tier (`CZT`), Tier Add-on
(`CZTA`), Tier Edition (`CZTE`), Tier Leg (`CZTL`), Tier Edition Leg
(`CZTEL`), Rate Sheet (`CZPRC`), Rate Sheet Group
(`CZPRCG`), Rate Sheet Item (`CZPRCI`), Price Option (`CZPRCIO`), and
[Rate Sheet Bundle](rate-sheet-bundle.md)'s `CZPRCB`/`CZPRCBI`/`CZPRCBIO`.
Tier/Add-on share one instance-qualified occupant reference; Edition's is
occupant- not slot-qualified; a Leg further qualifies by its own `legId`
— see [Commercial Legs](commercial-legs.md). Rate Sheet Group/Item/Option
use `(rate_sheet_id, group_id)`/`(rate_sheet_id, item_id)`/
`(rate_sheet_id, item_id, option_id)`; Bundle scopes qualify by `bundle_id`.
Package adapters retain ownership and delegate registry work here. Tier
Promotion (`CZTP`) is deferred.

CRM-1A registers `request` (`CZR`). `RequestsController` reserves before
`wp_insert_post()`, binds via `RequestRepository`'s scalar `cz_platform_id`
claim (mirroring `CategoryMeta`), rolling back both on failure. Native
identity here isn't deterministic — concurrent same-ref submissions would
insert two posts — so a creation lock (opaque-token compare-and-swap over
one `add_option()` option) serializes them onto one winner first. No backfill.
