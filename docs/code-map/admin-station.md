# Admin Station

The Admin Station is a **new, independent administration environment**, built fresh rather than migrated from the existing admin. It is currently **frozen at an empty structural shell** — four regions only, with no navigation, content, branding, or visual theme decided yet:

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

- `AdminStation.tsx` — root application boundary; renders the layout.
- `shell/AdminStationLayout.tsx` — composes the four structural regions; arrangement only.
- `shell/AdminStationHeader.tsx`, `AdminStationSidebar.tsx`, `AdminStationBody.tsx`, `AdminStationFooter.tsx` — empty semantic containers (`<header>` / `<aside>` / `<main>` / `<footer>`) with structural class names. No contents.
- `styles/admin-station.css` — minimal neutral structural layout that positions the four regions. No colour system, theme, typography, or component styling.
- `styles/admin-station-tokens.css`, `styles/admin-station-responsive.css` — intentionally empty; no token system or responsive/navigation pattern established yet.

Module entry: `resources/ts/modules/admin-station.ts` registers `AdminStation` against the `compuzign-admin-station` shortcode mount and imports the three stylesheets. Added as a Vite input in `vite.config.ts` → emits `dist/js/admin-station.js` and `dist/css/admin-station.css`.

## Backend (WordPress)

- `src/Modules/AdminStation/AdminStationModule.php` — registers the `compuzign_admin_station` frontend shortcode and the `admin-station` health check. Renders the mount div for logged-in platform managers (`AdminRouter::CAP` — a shared capability contract), a short notice otherwise.
- `app/modules/admin-station/templates/admin-station.php` — outputs `<div id="compuzign-admin-station"></div>`.
- `src/Core/AssetLoader.php` — `registerAdminStationAssets()` registers the `compuzign-admin-station` script/style from `dist/` on the frontend `wp_enqueue_scripts` hook; the handle is in `MODULE_HANDLES` so it loads as an ES module.
- `src/Core/Plugin.php` — boots `AdminStationModule`.

## Related Code Maps

Consult these only when a specific area is later rebuilt inside the Admin Station: [Service Catalogue](service-catalogue.md), [Package Manager](package-manager.md), [Lifecycle and Module State](lifecycle-system.md).
