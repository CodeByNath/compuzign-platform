# Account Station

Account Station is a peer Station, distinct from `station-manager/` (frontend
coordinator) and Admin Station (presentation/control host). It owns a single
permanent singleton tree — **Account Station → Settings → Tools → Profile**
— and Profile's first section, **Brand**. Settings, Tools, and Profile are
Account-owned child records, never separate peer Stations.

Account Station does not own WordPress users, authentication, or unrelated records.

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

Each is a true singleton — exactly one, ever — so the native reference is a
fixed string, not a record id. `Support/AccountIdentity::bootstrap()`
reserves/binds all four in parent order on the first authenticated Save; a
repeated or interrupted call resumes idempotently through `ensure()` rather
than minting a second identity. A losing concurrent first-Save leaves only a
harmless unused reservation and must retry.

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
Publish, Disable and Enable are all rejected outright against a
never-bootstrapped install — unlike Service, whose id must exist before its
`/status` route is addressable. All four share one predicate,
`isBootstrapped()`, true only once all four chain nodes are bound, not just
the Profile leaf.

**Archive/Trash/permanent-delete are not implemented.** A singleton that can
never not-exist has no instance to restore into, and Platform Identifier
Station's reservations are never deleted or reused, so a travel action has
no legal destination. Flagged per the Owner's stated carve-out.

## Frontend

`resources/ts/account-station/` mirrors `service-station/`'s shape at
Account's one-module scale: `types.ts`/`api.ts`, `useAccountStation.ts`
(state/mutations/lifecycle), `drawer/` (`schema/entities/account.ts`'s
`ACCOUNT_ENTITY`, the Brand editor and its Logo/Favicon pickers), and
`surface/` (`AccountDrawerHost.tsx`; `useAccountProfileCard.ts` binds a
one-item collection to Admin's existing `category-group-cards` kit — no new
card code). `register.ts` registers Account's own
navigation/destination/source/drawer; Admin's `register.ts` adds only the
one `presentation` surface binding (placement policy, no domain logic). No
numeric/string record id, so no create/new branch — `bootstrapped` is the
frontend's sole gate. One Publish action only: it settles then activates;
an already-active re-Publish settles only, since `/status` 422s on an
already-active record. No Archive/Trash/Restore/Delete, matching the
carve-out above.

**Logo/Favicon (Phase 2B):** an inline picker in the Brand editor — Upload
new, Choose existing (one shared, lazily fetched list), Clear — replaces the
WordPress Media Library dialog. Choosing an image sets `*_media_id` and drops
a legacy attachment id; the reference persists only via an ordinary Save.
Previews use read-only `logo_url`/`favicon_url`.

## Backend

- `src/Modules/Account/AccountModule.php` — module wiring, injected with the
  shared `PlatformIdentifierStation` from `Core\Plugin`.
- `Http/AccountController.php` — `GET /admin/account-station` (read-only),
  `POST /admin/account-station/profile` (Save), `.../profile/settle`,
  `.../profile/media` (POST upload, GET `.../media/library` list — neither
  writes Brand state), `.../status` (Publish/Disable/Enable). All six gated
  by the existing `requireAdmin` → `current_user_can(PlatformAccess::CAP)`
  pattern, same as `ServiceController`.
- `Support/AccountSchema.php` — Brand field shape/sanitization; a negative
  or non-image attachment id, or an unknown media key, fails the whole Save
  closed. `presentBrand()` adds read-only `logo_url`/`favicon_url`.
- `Support/AccountMedia.php` — stores/lists/resolves the images: type
  sniffed from bytes (JPEG/PNG/GIF/WebP, 5 MB), hash-named, idempotent on
  identical bytes. Abandoned uploads stay listed and selectable; none are
  deleted.
- `Support/AccountIdentity.php` — the four-node bootstrap chain.
- `Support/AccountRepository.php` — the one aggregate option.
- `tests/account-station.php` — bootstrap/draft/lifecycle contracts plus
  the upload/list/reference paths against real files, via the real
  controller.

## Related Code Maps

[Station Manager](station-manager.md), [Admin Station](admin-station.md),
[Platform Identifier Station](platform-identifier-station.md), and
[Lifecycle and Module State](lifecycle-system.md).
