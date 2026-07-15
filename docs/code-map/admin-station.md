# Admin Station

The Admin Station is a **new, independent administration environment**, built fresh rather than migrated from the existing admin. It is currently **frozen at an empty structural shell**:

```
AdminStation
├── Header
├── Sidebar
├── Body
└── Footer
```

Future business areas will be built fresh inside it, one at a time, only when explicitly specified. The old implementation is never moved into this tree; it may later be inspected only to preserve required behaviour, contracts, validation, permissions, and downstream data shapes.

## Boundary

The Admin Station may share only **platform infrastructure** with the existing system:

- WordPress plugin boot
- capability checks
- asset registration and loading
- Vite / build infrastructure

It must **not** share or import: the existing admin application tree or shell, Station Manager, Service or Package components, business hooks, the entity registry, relation providers, drawer builders, or old UI state.

It mounts only on its **own frontend page** via the `[compuzign_admin_station]` shortcode — the repository's established application-mounting architecture. It is **not** exposed anywhere inside `/wp-admin/`: no admin menu/submenu, dashboard mount, toolbar link, admin-page entry, or `admin_enqueue_scripts` wiring.

## Frontend (Preact)

Root: `wp-content/plugins/compuzign-platform/resources/ts/admin-station/`

- `AdminStation.tsx` — root application boundary; composes provider + layout.
- `AdminStationContext.tsx` — application-level state: active destination and responsive sidebar state (`collapsed`, `mobileOpen`). Knows nothing about Service/Package/Tier/pricing.
- `AdminStationRegistry.ts` — the single destination list. Drives **both** the sidebar and the outlet, so navigation and routing cannot diverge.
- `AdminStationRouter.tsx` — `StationOutlet`, mounts the active destination's component.
- `shell/` — `AdminStationLayout` (grid frame), `AdminStationHeader`, `AdminStationSidebar`, `AdminStationNavigation`, `AdminStationBody` (owns positioning/scroll/padding, hosts the outlet), `AdminStationFooter`, and `icons.tsx`.
- `surfaces/AdminStationHome.tsx` — the empty landing surface.
- `styles/` — `admin-station-tokens.css` (self-contained token set scoped to `.cz-admin-station`), `admin-station.css` (base layout), `admin-station-responsive.css` (sidebar becomes an overlay drawer below 960px).

Module entry: `resources/ts/modules/admin-station.ts` registers `AdminStation` against the `compuzign-admin-station` shortcode mount and imports the three stylesheets. Added as a Vite input in `vite.config.ts` → emits `dist/js/admin-station.js` and `dist/css/admin-station.css`.

## Backend (WordPress)

- `src/Modules/AdminStation/AdminStationModule.php` — registers the `compuzign_admin_station` frontend shortcode and the `admin-station` health check. Renders the mount div for logged-in platform managers (`AdminRouter::CAP` — a shared capability contract), a short notice otherwise.
- `app/modules/admin-station/templates/admin-station.php` — outputs `<div id="compuzign-admin-station"></div>`.
- `src/Core/AssetLoader.php` — `registerAdminStationAssets()` registers the `compuzign-admin-station` script/style from `dist/` on the frontend `wp_enqueue_scripts` hook; the handle is added to `MODULE_HANDLES` so it loads as an ES module.
- `src/Core/Plugin.php` — boots `AdminStationModule`.

## Related Code Maps

Consult these only when a specific area is later rebuilt inside the Admin Station: [Service Catalogue](service-catalogue.md), [Package Manager](package-manager.md), [Lifecycle and Module State](lifecycle-system.md).
