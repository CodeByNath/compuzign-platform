# Platform Settings and Profile

## Purpose and boundary

Platform Settings is CompuZign platform-wide configuration authority. It
owns two singleton domain records, their schema, validation, brand image
assets, identity bootstrap, and authenticated API. It is backend
infrastructure like the [Platform Identifier Station](platform-identifier-station.md):
it is not a Station Manager Station, owns no Service or user data, and Service
Station Settings is only where its Profile will be presented (Phase 2,
pending). The host supplies option storage and an uploads directory behind
platform-owned ports; it owns no identity or product rule here.

## Authoritative files

Root: `wp-content/plugins/compuzign-platform/src/PlatformSettings/`

- `PlatformSettingsStation.php` — reads, verified read-by-Platform-ID, the
  one-Save flow, field rules, asset sweep.
- `PlatformSettingsIdentity.php` — identity bootstrap/recovery and
  registry verification.
- `PlatformSettingsRepository.php` — `cz_platform_settings`,
  `cz_platform_profile` (non-autoloaded), the atomic Profile commit and the
  `cz_platform_settings_lock` compare-and-swap save lock.
- `PlatformSettingsNativeReference.php` — singleton native references.
- `BrandAssetStore.php` port; `UploadsBrandAssetStore.php` adapter
  (`uploads/compuzign/brand/`, outside the deploy checkout).
- `BrandImageProcessor.php` — Owner image Option A.
- `PlatformSettingsController.php` — REST routes; `PlatformSettingsFailure.php`
  — coded, status-bearing failures.
- Wiring: `src/Core/Plugin.php` injects the shared identifier Station.

## Records and identity

- **Settings root** (`platform_settings`): its Platform ID plus the section
  index `sections.profile` → the Profile's ID and record.
- **Profile** (`platform_settings_profile`): its Platform ID,
  `parent_platform_id`, `revision`, and `brand` (`name` ≤60, `code` A–Z ≤6
  stored uppercase, `logo`/`favicon` asset references or null).
- Asset references store an opaque `<sha256>.<ext>` key with mime,
  dimensions, size and source mime — never a host URL or attachment.

Both IDs are minted only by the shared identifier Station, on the first
successful Save (Settings → Profile → section link), never on read and never
again. An interrupted bootstrap resumes by finishing the exact stored
reservation. Canonical and by-ID reads classify identity against the
registry and links: `unassigned` (no Save yet), `incomplete` (resumable;
IDs withheld), or `verified`. Anything else fails closed with
`settings_identity_conflict`.

## Save contract

Validate fields and decode images → write immutable content-addressed files
→ claim lock → check `expected_revision` → bootstrap identity → confirm this
request's files still exist → one atomic Profile commit (`revision + 1`): a
single UPDATE that lands only while this Save's lock row holds its value and
the stored Profile bytes are exactly those whose revision and identity were
checked, so a lost lock or newer revision fails it (409) → sweep unreferenced files older than 15 minutes,
stopping if the lock is lost → release. The store never overwrites or
follows a symlinked name; reuse refreshes a file's time. Any failure before
the commit leaves the Profile and every file it references unchanged.

## Images (Option A)

Client MIME and extension are ignored, and no uploaded bytes are stored
as-is. PNG, JPEG, WebP and GIF are fully decoded (any decoder warning
refuses) and re-encoded in kind; animated GIF needs Imagick or is refused.
ICO yields its largest embedded PNG. Other rasters become PNG via GD or
magic-gated Imagick. SVG is refused. The favicon must be square.

## API

All routes require `PlatformAccess::CAP` and a valid `wp_rest` nonce.

- `GET /compuzign/v1/admin/platform-settings`
- `GET /compuzign/v1/admin/platform-settings/{CZPS id}`
- `GET|POST /compuzign/v1/admin/platform-settings/profile`
- `GET /compuzign/v1/admin/platform-settings/profiles/{CZPSP id}`

Asset URLs are public static files; editable data is never anonymous.

## Validation

From the plugin root: `php tests/platform-settings-profile.php`,
`php tests/platform-settings-controller.php`,
`php tests/platform-settings-safety.php`,
`php tests/platform-identifier-station.php`,
`npm run contract:platform-identity-schema`, and `npm run docs:check`.

## Related Code Maps

[Platform Identifier Station](platform-identifier-station.md),
[Service Station](service-station.md), [Admin Station](admin-station.md).
