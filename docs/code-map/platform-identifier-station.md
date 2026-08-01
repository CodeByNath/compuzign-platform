# Platform Identifier Station

## Purpose and boundary

`PlatformIdentifierStation` is backend Platform infrastructure for permanent,
globally unique identity. It owns identifier policy, secure generation, atomic
reservation, immutable binding, forward/reverse lookup, deletion tombstones,
conflict detection, and bounded existing-record assignment.

It owns no native entity, lifecycle, validation, draft, projection, pricing,
relationship, drawer, or domain action. Owners supply scalar identity
read/write and bounded enumeration callbacks. The Station is not the frontend
Station Manager and must never be registered there.

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
  Service/Category-only WP-CLI backfill orchestration.
- `src/PlatformIdentifier/TemporaryMigrationController.php` — temporary
  authenticated live dry-check/batch surface; remove after verified completion.
- `tests/platform-identifier-station.php` and
  `tests/platform-identifier-existing-assignment.php` — engine and backfill contracts.
- `docs/platform-identifier-roadmap.md` — phased integration state.

## Registry contract

Forward options are `cz_platform_identifier_v1_{platformId}`. Reverse options
are `cz_platform_identifier_native_v1_{entityType}_{typed-reference-hash}`.
Every option is non-autoloaded. Records contain version, Platform ID, entity
type, native reference, `reserved|bound|retired|deleted` status, and timestamps.
Reservations and tombstones are never deleted or reused.

The shared scalar entity key is `cz_platform_id`, but each owning domain
chooses and controls its correct persistence mechanism. `int|string` native
references support both WordPress-native and owner-defined stored identities.

## Current integration status

`Core\Plugin` constructs one Station. Phase 2 injects it through `ServiceModule`;
Service owns `cz_platform_id` post meta and `CZS` integration. Phase 3 injects
the same instance through `AdminModule`; Category owns atomic
`cz_platform_id` term-meta claims, both `CZC` creation paths, projection,
immutable request rejection, and guarded hard deletion. Intermediate Phase 3A
adds authenticated owner-specific reads at
`GET /admin/services/{platformId}` and `GET /admin/categories/{platformId}`.
Each resolves here, rejects non-bound/conflicting/wrong-entity bindings, then
calls its owner's existing projection by native numeric ID. The shared drawer
schema carries optional `platformIdOf`; native `idOf` remains unchanged.

Phase 3B registers
`wp compuzign platform-identifiers assign <service|category>` when WP-CLI is
active. `--limit` defaults to 100 and is capped at 500; `--cursor` defaults to
zero. Each invocation returns JSON with processed/assigned/preserved/conflict
counts, completion, and the next cursor. No Package or later type is accepted.

While Phase 3C is active, Admin refresh reads temporary migration status and
runs a zero-write Service/Category preflight. Explicit assignment processes one
100-record owner batch through `assignExistingBatch()`, guarded by a 45-second
atomic lock. Invalid, duplicate, or conflicting bindings stop assignment. The
completion option remains after the temporary controller and notice are removed.

Package Phase 4 is paused: Service is lifecycle-conformant, while Package
Station remains pending migration. Package identity begins only after its
owner, native record, creation handoff, lifecycle, drawer/module behaviour,
Enable/Disable rules, and schema are locked. No Package runtime is integrated.
