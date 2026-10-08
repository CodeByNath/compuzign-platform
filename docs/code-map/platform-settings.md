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
  one-Save flow, identity bootstrap/recovery, field rules, asset sweep.
- `PlatformSettingsRepository.php` — `cz_platform_settings`,
  `cz_platform_profile` (non-autoloaded, exact read-back) and the
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
reservation; any other registry, parent-link or owner-record disagreement
fails closed with `settings_identity_conflict`.

## Save contract

Validate fields and decode images → write immutable content-addressed files
→ claim lock → check `expected_revision` → bootstrap identity → recheck lock
ownership and revision → single Profile commit (`revision + 1`) → sweep
unreferenced files older than 15 minutes → release. Any failure before the
commit leaves the Profile and every file it references unchanged.

## Images (Option A)

Content is sniffed; client MIME and extension are ignored. PNG, JPEG, GIF,
WebP and ICO are stored as-is. Other rasters are converted to PNG by GD, or by
Imagick only for magic-verified TIFF/BMP/JP2/AVIF/HEIC. SVG is refused, never
stored. The favicon must be square. Unconvertible input is a clear 415.

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
`php tests/platform-identifier-station.php`,
`npm run contract:platform-identity-schema`, and `npm run docs:check`.

## Related Code Maps

[Platform Identifier Station](platform-identifier-station.md),
[Service Station](service-station.md), [Admin Station](admin-station.md).
