# Admin Station

The Admin Station is an independent frontend administration host mounted by `[compuzign_admin_station]`. It owns its shell, navigation, surface projection, and one entity-agnostic drawer. It reuses host-neutral platform capability without importing Command Centre routing or UI ownership.

Root: `wp-content/plugins/compuzign-platform/resources/ts/admin-station/`

## Boundary

Admin Station may consume typed APIs, authoritative station hooks, `drawer-kit/`, and `entity-drawers/`. It must not runtime-import `components/admin`, `StepContext`, Command Centre shells, relation hosts, or their registries. Shared placement never transfers persistence authority.

It mounts only on its frontend shortcode page, not `/wp-admin/`.

## Frontend shell

- `AdminStation.tsx` — root providers and theme scope.
- `AdminStationContext.tsx` — theme plus active destination state/resolution.
- `shell/AdminStationLayout.tsx` — Header, Body, Footer, slide menu, and sibling drawer overlay.
- `shell/AdminStationHeader.tsx`, `AdminStationSlideMenu.tsx`, `AdminStationDropdown.tsx` — shell navigation and local controls.
- `shell/AdminStationBody.tsx` — resolves every presentation binding for the active station and dispatches card intents to the drawer controller. It contains no entity branch.
- `shell/drawer/` — one shell/controller; entity templates register under `stations/drawers/`. See [Admin Station Drawer](admin-station-drawer.md).
- `theme/useStationTheme.ts` — guarded localStorage theme persistence.

`resources/ts/modules/admin-station.ts` mounts the app and imports its styles. `vite.config.ts` emits `dist/js/admin-station.js`, `dist/css/admin-station.css`, and the shared drawer stylesheet entry.

## Backend

- `src/Modules/AdminStation/AdminStationModule.php` — shortcode, capability gate, and health registration.
- `app/modules/admin-station/templates/admin-station.php` — mount element.
- `src/Core/AssetLoader.php` — Admin Station and shared drawer asset registration.
- `src/Core/Plugin.php` — module boot.

## Runtime flow

Navigation resolves a native station destination. Body asks `surfaceBindings.ts` for the station's presentation walls; `StationSurfaceHost` composes a registered read source and template kit. Native record intents open a registered host adapter inside the single drawer. Successful mutations refresh only the originating wall.

## Validation

From `wp-content/plugins/compuzign-platform/`: `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Navigation](admin-station-navigation.md), [Surface Binding](admin-station-surface-binding.md), [Home Shell](admin-station-home-shell.md), [Drawer](admin-station-drawer.md), [Styles](admin-station-styles.md), and [Cards](admin-station-cards.md).
