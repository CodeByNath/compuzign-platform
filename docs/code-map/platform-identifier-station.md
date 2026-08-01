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
- `tests/platform-identifier-station.php` — isolated locked contract.
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

Phase 1 implements and tests the engine only. Nothing constructs the Station at
runtime yet, and no domain projection or persistence path has changed. Service,
Category, Package, Tier, Promotion, and Rate Card integrations remain pending
their roadmap phases.
