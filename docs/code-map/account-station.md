# Account Station

Account Station is a peer Station, distinct from `station-manager/` (frontend
coordinator) and Admin Station (presentation/control host). It owns a single
permanent singleton tree — **Account Station → Settings → Tools → Profile**
— and Profile's first section, **Brand**. Settings, Tools, and Profile are
Account-owned child records, never separate peer Stations.

**Phase 1 is backend only.** No frontend Station registration, navigation,
presentation, or drawer exists yet; Admin Station hosts those in a later
phase. Account Station does not own WordPress users, authentication, or any
unrelated business record.

## Identity

Four Platform ID families, minted/bound solely by the existing
[Platform Identifier Station](platform-identifier-station.md) through its
ordinary `ensure()` idempotency — never a second identity mechanism:

| Level | Prefix | Native reference (fixed constant) |
| --- | --- | --- |
| Account Station | `CZA` | `account_station:root` |
| Settings | `CZAS` | `account_settings:root` |
| Tools | `CZAST` | `account_tools:root` |
| Profile | `CZASTP` | `account_profile:root` |

Each is a true singleton — exactly one of each, ever, on this install — so
the native reference is a fixed string rather than a numeric/string record
id. `Support/AccountIdentity::bootstrap()` reserves/binds all four in parent
order on the first authenticated Save; a repeated or interrupted call
resumes idempotently through `ensure()` rather than minting a second
identity. A losing concurrent first-Save leaves only a harmless unused
reservation (reservations are never reused) and must retry.

## Storage

One non-autoloaded WordPress option, `cz_account_station_v1`
(`Support/AccountRepository.php`), holds the four identity nodes
(`platform_id`, `parent_platform_id`), canonical Brand fields, the Brand
draft, and lifecycle state. No post type, no additional database, no ACF,
no generic persistence engine.

## Lifecycle

Account Station's Profile follows the locked
[Station and Drawer Lifecycle Contract](../architecture/StationDrawerLifecycleContract-v1.md)
exactly as Service does, with one module (`brand`) instead of three:
Save writes the Brand draft and bootstraps identity on the very first call
(Overview-Save-creates-the-record, in one request); settle promotes the
draft to canonical; Publish (`platform_status: 'active'`, via
`StationLifecycle::publish()`) activates; Disable/Enable are the same
presentation mask Service uses, never a module/draft rewrite. Brand has no
required field — blanks are valid — so it always settles
(`AccountSchema::isBrandComplete()` is unconditionally true). Settle,
Publish, Disable and Enable are all rejected outright against a never-bootstrapped
install, a case Service has no equivalent of since a Service id must exist
before its `/status` route is addressable. All four share one predicate,
`isBootstrapped()`, true only once all four chain nodes are bound, not just
the Profile leaf.

**Archive/Trash/permanent-delete are not implemented.** A singleton that can
never not-exist has no second instance to restore into and no state to
return to after deletion — Platform Identifier Station's own reservations
and tombstones are never deleted or reused, so there is no legal destination
for a travel action here. Flagged per the Owner's own stated carve-out
rather than silently extending or narrowing the locked contract.

## Backend

- `src/Modules/Account/AccountModule.php` — module wiring, injected with the
  shared `PlatformIdentifierStation` from `Core\Plugin`.
- `Http/AccountController.php` — `GET /admin/account-station` (read-only),
  `POST /admin/account-station/profile` (Save), `.../profile/settle`,
  `POST /admin/account-station/status` (Publish / Disable / Enable). Gated
  by the existing `requireAdmin` → `current_user_can(PlatformAccess::CAP)`
  pattern, same as `ServiceController`.
- `Support/AccountSchema.php` — Brand field shape/sanitization. Logo and
  Favicon are WordPress attachment ids (the standard Media Library picker),
  never a bespoke upload/decode pipeline; 0/empty clears, while a negative
  or non-image id fails the whole Save closed rather than being silently
  cleared.
- `Support/AccountIdentity.php` — the four-node bootstrap chain.
- `Support/AccountRepository.php` — the one aggregate option.
- `tests/account-station.php` — bootstrap idempotency/parent-chain, draft
  save/settle, rejected-attachment-leaves-no-partial-write, and the full
  Publish/Disable/Enable lifecycle, against the real controller.

## Related Code Maps

[Station Manager](station-manager.md), [Admin Station](admin-station.md),
[Platform Identifier Station](platform-identifier-station.md), and
[Lifecycle and Module State](lifecycle-system.md).
