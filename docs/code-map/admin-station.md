# Admin Station

The Admin Station is an independent frontend administration host mounted by `[compuzign_admin_station]`. It owns shell chrome, presentation/control capabilities, presentation policy, and one entity-agnostic drawer shell. Station Manager coordinates navigation and surface resolution; domain Stations retain their capabilities and authority.

Root: `wp-content/plugins/compuzign-platform/resources/ts/admin-station/`

## Boundary

Admin Station consumes Station Manager contracts and registered peer capabilities. It must not runtime-import `components/admin`, `StepContext`, Command Centre shells, relation hosts, or their registries. Shared placement never transfers persistence authority.

It mounts only on its frontend shortcode page, not `/wp-admin/`.

## Frontend shell

- `AdminStation.tsx` — root providers and theme scope.
- `AdminStationContext.tsx` — theme plus active destination state/resolution.
- `shell/AdminStationLayout.tsx` — Header, Body, Footer, slide menu, and sibling drawer overlay.
- `shell/AdminStationHeader.tsx`, `AdminStationSlideMenu.tsx`, `AdminStationDropdown.tsx` — shell navigation and local controls.
- `shell/AdminStationBody.tsx` — resolves every presentation binding for the active station and dispatches card intents to the drawer controller. It contains no entity branch.
- `shell/drawer/` — one shell/controller; owning Stations register drawer contracts through Station Manager. See [Admin Station Drawer](admin-station-drawer.md).
- `register.ts` — Admin presentation/control registration plus string-key presentation policy.
- `theme/useStationTheme.ts` — guarded localStorage theme persistence.

`resources/ts/modules/admin-station.ts` imports Service, Package, and Admin registration functions, applies Admin presentation policy, finalizes Station Manager, then mounts the app. It remains the only importer of peer `register.ts` files. `vite.config.ts` emits `dist/js/admin-station.js`, `dist/css/admin-station.css`, and the shared drawer stylesheet entry.

## Backend

- `src/Modules/AdminStation/AdminStationModule.php` — shortcode, capability gate, and health registration.
- `app/modules/admin-station/templates/admin-station.php` — mount element.
- `src/Core/AssetLoader.php` — Admin Station and shared drawer asset registration.
- `src/Core/Plugin.php` — module boot.

## Runtime flow

Station Manager resolves navigation and Admin-authored presentation bindings; its `StationSurfaceHost` composes the registered read source and kit. Native record intents resolve the owning Station's drawer contract inside the Admin shell. Successful mutations refresh only the originating wall.

## Validation

From `wp-content/plugins/compuzign-platform/`: `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Navigation](admin-station-navigation.md), [Surface Binding](admin-station-surface-binding.md), [Home Shell](admin-station-home-shell.md), [Drawer](admin-station-drawer.md), [Styles](admin-station-styles.md), and [Cards](admin-station-cards.md).
