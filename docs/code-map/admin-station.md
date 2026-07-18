# Admin Station

The Admin Station is a **new, independent administration environment**, built fresh rather than migrated from the existing admin. Its structure is:

```
AdminStation
├── Header
├── Body
│   └── Home shell (station-agnostic template)
│       ├── Presentation region   (Category Group card grid)
│       └── Station-group region  (dynamic tabs + active group panel)
└── Footer    (empty)
+ a left slide-menu overlay opened from the Header
```

There is no fixed sidebar column. Business areas are built fresh inside it, one at a time, only when explicitly specified; the old implementation is inspected only to preserve required behaviour, contracts, validation, permissions, and downstream data shapes — never moved into this tree.

This map owns the **shell frame**. Focused sub-maps own the rest: [Navigation & Destination Resolver](admin-station-navigation.md), [Home Shell](admin-station-home-shell.md), [Styles](admin-station-styles.md), [Cards](admin-station-cards.md).

## Boundary

Shares only **platform infrastructure** with the existing system: WordPress plugin boot, capability checks, asset registration/loading, and Vite/build infrastructure. It must **not** import the existing admin app **shell, business components, hooks, the old entity/station registries, relation providers, drawer builders, or old UI state**. Shared **utilities and type-only contracts** may cross (e.g. `schema/presentation`, `utils/moduleStatus`, and type-only `ModuleNote` / `ShellMode`), erased or forked so no old renderer or state co-loads.

Mounts only on its own **frontend page** via the `[compuzign_admin_station]` shortcode. It is **not** exposed in `/wp-admin/` (no admin menu/submenu, dashboard mount, toolbar link, or `admin_enqueue_scripts` wiring).

## Frontend shell frame (Preact)

Root: `wp-content/plugins/compuzign-platform/resources/ts/admin-station/`

- `AdminStation.tsx` — root; provides context and stamps `data-station-theme` (light/dark) on the `.cz-admin-station` root, which scopes all token overrides.
- `AdminStationContext.tsx` — application state: `theme` + `toggleTheme`, `activeDestinationId` + `navigate`, and `activeDestination` (the id resolved through the [destination resolver](admin-station-navigation.md)). Selecting a nav item records and resolves the active destination; no surface is projected yet (the Body renders the Home shell).
- `theme/useStationTheme.ts` — light/dark state persisted via a safe try/catch localStorage guard (mirrors `utils/cartStorage.ts`); degrades to session-only if storage is unavailable. Defaults to **dark**.
- `shell/AdminStationLayout.tsx` — composes Header, Body, Footer, and the slide-menu overlay; owns menu open state and routes selections.
- `shell/AdminStationHeader.tsx` — `[menu] CompuZign [Services][Packages][Promotions] … [theme][apps][user]`. Pills render from the navigation source. Theme toggles the token theme; apps/user each open a small empty dropdown (single-open, dismiss on outside-click/Escape, `aria-expanded`/`aria-controls`).
- `shell/AdminStationSlideMenu.tsx` — left overlay + backdrop; same navigation source; scroll-lock while open; focus moves into the panel and returns to the menu button on close; empty footer region.
- `shell/AdminStationDropdown.tsx` — reusable **empty** dropdown surface (positioning + token-driven surface only; no content).
- `shell/AdminStationBody.tsx` — hosts the Home shell; resolves the active station's presentation surface through the dynamic binding table and renders it via the generic `StationSurfaceHost` (see [Surface Binding](admin-station-surface-binding.md)) — no hardcoded data source or kit. Dispatches card intents to the drawer controller (`openFromIntent`); supplies no groups. `shell/AdminStationFooter.tsx` — empty semantic container.
- `shell/drawer/` — the shared, entity-agnostic drawer: controller (`AdminStationDrawerContext.tsx`) + shell (`AdminStationDrawer.tsx`), with the drawer template registry under `stations/drawers/`. See [Admin Station Drawer](admin-station-drawer.md). Mounted by `AdminStationLayout.tsx` (a sibling overlay, like the slide menu) and provided from `AdminStation.tsx`.
- `shell/icons.tsx` — local icon set (Heroicons v2 solid, 24×24, `currentColor`): menu, Services/Packages/Promotions, sun, moon, apps, user, chevron-down, view.

Module entry `resources/ts/modules/admin-station.ts` registers `AdminStation` against the `compuzign-admin-station` shortcode mount and imports the three stylesheets; a Vite input in `vite.config.ts` emits `dist/js/admin-station.js` and `dist/css/admin-station.css`.

## Backend (WordPress)

- `src/Modules/AdminStation/AdminStationModule.php` — registers the `compuzign_admin_station` frontend shortcode and the `admin-station` health check; renders the mount div for logged-in platform managers (`AdminRouter::CAP`).
- `app/modules/admin-station/templates/admin-station.php` — outputs `<div id="compuzign-admin-station"></div>`.
- `src/Core/AssetLoader.php` — `registerAdminStationAssets()` registers the script/style on the frontend `wp_enqueue_scripts` hook; handle in `MODULE_HANDLES`.
- `src/Core/Plugin.php` — boots `AdminStationModule`.

## Related Code Maps

[Navigation & Destination Resolver](admin-station-navigation.md), [Home Shell](admin-station-home-shell.md), [Styles](admin-station-styles.md), [Cards](admin-station-cards.md).

Consult only when an area is later rebuilt inside the Admin Station: [Service Catalogue](service-catalogue.md), [Package Manager](package-manager.md), [Lifecycle and Module State](lifecycle-system.md).
