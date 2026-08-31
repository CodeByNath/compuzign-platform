# Admin Station

Admin Station is the presentation and control Station mounted by `[compuzign_admin_station]`. It owns the visible administration shell, presentation tools, and display policy. It is also the thin host through which Station Manager composes capabilities registered by Service Station and Package Station; hosting does not transfer domain or persistence authority.

Frontend root: `wp-content/plugins/compuzign-platform/resources/ts/admin-station/`

## Ownership

- `presentation/` owns the station presentation shell, generic card-grid kit, Service Category carousel, status pill, metric, split-action, and tab-set components. Peer imports of these modules are legal consumption of Admin presentation capabilities. `StationTabSet.tsx` is the one tab primitive for lanes inside a wall; see [Station Tab Set](station-tab-set.md).
- `shell/` owns layout and navigation chrome, icons, local controls, and the single entity-agnostic drawer shell.
- `register.ts` registers Admin's own Promotions navigation/destination, Service Category source, presentation kits, and Category drawer. Its separate `registerPresentationPolicy()` declares all current surface bindings and the default home by string key.
- `stations/serviceCategory/` is retained Admin residue until Service Categories are re-owned in a later increment.
- `theme/`, `home/`, and `styles/` remain presentation concerns.

Admin Station does not own Service or Package data, validation, lifecycle, saves, or drawer compositions. It does not runtime-import the legacy `components/admin` tree, Command Centre shells, `StepContext`, or their registries.

## Boot and runtime

`resources/ts/modules/admin-station.ts` is the only importer of peer `register.ts` files. It imports styles, calls Service, Package, and Admin registration, applies Admin presentation policy, finalizes Station Manager, and then registers the Preact app with the runtime mount registry.

The app flow is:

```text
registered navigation → resolved destination → active station
  → Admin presentation shell → Station Manager surface host
  → owning Station source + registered presentation kit
  → native-record intent → Admin drawer shell
  → owning Station drawer contract and save authority
```

`AdminStationContext.tsx` holds only theme and selected destination state. `shell/AdminStationBody.tsx` selects the resolved station, falling back to Station Manager's default, and renders one `StationPresentationShell`. Successful drawer mutations refresh only the surface that opened the drawer.

During the one-time Package entity Platform Identifier migration only,
`shell/PlatformIdentifierMigrationNotice.tsx` checks temporary authenticated
status on refresh, renders the existing notification primitive, runs the
zero-write scoped preflights, and exposes one explicit bounded-assignment
button. Successful completion renders nothing. Remove this notice and its
Body/CSS wiring only after verified live completion; Promotion is excluded.

## Backend and assets

- `src/Modules/AdminStation/AdminStationModule.php` owns the shortcode, capability gate, and health registration. A logged-out visitor renders the branded login gate; a logged-in visitor without `PlatformAccess::CAP` renders a product-styled access-denied state — never WP admin.
- `src/Modules/AdminStation/AdminStationAuth.php` processes the login gate's POST submission on `template_redirect` (early enough for `wp_signon()`'s auth cookies), redirecting back to the same page it was submitted from — never a fixed slug. WordPress remains the auth/session host; this owns no role/capability/account provisioning (`Core\PlatformAccess`'s job).
- `app/modules/admin-station/templates/admin-station.php`, `login-gate.php`, `access-denied.php` supply the mount element and the two gate states, sharing the drawer kit's `cz-tf-*` fields, `cz-admin-btn` buttons, and `cz-admin-error-msg`.
- `src/Core/AssetLoader.php` registers the Admin Station and shared drawer assets.
- `vite.config.ts` emits the Admin Station JavaScript and CSS bundles.

The Station mounts only on its frontend shortcode page, not `/wp-admin/` — including its login gate, which is not the retired Command Centre's fixed `/admin-command-centre/` page.

## Related Code Maps

[Station Manager](station-manager.md), [Navigation](admin-station-navigation.md), [Surface Binding](admin-station-surface-binding.md), [Home Shell](admin-station-home-shell.md), [Drawer](admin-station-drawer.md), [Cards](admin-station-cards.md), and [Styles](admin-station-styles.md).
