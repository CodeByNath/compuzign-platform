# Admin Station

The Admin Station is a **new, independent administration environment**, built fresh rather than migrated from the existing admin. Its structure is:

```
AdminStation
├── Header
├── Body      (empty)
└── Footer    (empty)
+ a left slide-menu overlay opened from the Header
```

There is no fixed sidebar column. Business areas will be built fresh inside it, one at a time, only when explicitly specified; the old implementation is inspected only to preserve required behaviour, contracts, validation, permissions, and downstream data shapes — never moved into this tree.

## Boundary

Shares only **platform infrastructure** with the existing system: WordPress plugin boot, capability checks, asset registration/loading, and Vite/build infrastructure. It must **not** import the existing admin app tree or shell, Station Manager, Service/Package/Promotion components, business hooks, the old entity/workstation registries, relation providers, drawer builders, or old UI state.

Mounts only on its own **frontend page** via the `[compuzign_admin_station]` shortcode. It is **not** exposed in `/wp-admin/` (no admin menu/submenu, dashboard mount, toolbar link, or `admin_enqueue_scripts` wiring).

## Frontend (Preact)

Root: `wp-content/plugins/compuzign-platform/resources/ts/admin-station/`

- `AdminStation.tsx` — root; provides context and stamps `data-station-theme` (light/dark) on the `.cz-admin-station` root, which scopes all token overrides.
- `AdminStationContext.tsx` — application state: `theme` + `toggleTheme`, and `activeDestinationId` + `navigate`. Selecting a nav item only records the active destination; no page mounts (Body stays empty).
- `theme/useStationTheme.ts` — light/dark state persisted via a safe try/catch localStorage guard (mirrors `utils/cartStorage.ts`); degrades to session-only if storage is unavailable. Defaults to **dark**.
- `navigation/stationNavigation.ts` — the **single navigation source** driving both the Header pills and the slide menu. Each `StationNavItem` has `id`, `label`, `icon`, `activationKey`, `showInHeader`, `showInMenu`, `order`. Initial items: Services, Packages, Promotions. Imports nothing from old registries.
- `shell/AdminStationLayout.tsx` — composes Header, Body, Footer, and the slide-menu overlay; owns menu open state and routes selections.
- `shell/AdminStationHeader.tsx` — `[menu] CompuZign [Services][Packages][Promotions] … [theme][apps][user]`. Pills render from the navigation source. Theme toggles the token theme; apps/user each open a small empty dropdown (single-open, dismiss on outside-click/Escape, `aria-expanded`/`aria-controls`).
- `shell/AdminStationSlideMenu.tsx` — left overlay + backdrop; same navigation source; scroll-lock while open; focus moves into the panel and returns to the menu button on close; empty footer region at the bottom.
- `shell/AdminStationDropdown.tsx` — reusable **empty** dropdown surface (positioning + token-driven surface/border/radius/shadow only; no content).
- `shell/AdminStationBody.tsx`, `shell/AdminStationFooter.tsx` — empty semantic containers.
- `shell/icons.tsx` — local icon set using the repository SVG system (Heroicons v2 solid, 24×24, `currentColor`): menu, Services/Packages/Promotions (reusing the repo `catalog`/`package`/`featured` paths), sun, moon, apps, user.
- `styles/admin-station-tokens.css` — scoped light/dark tokens: app/header/surface/elevated backgrounds, text, muted text, border, hover/active bg, focus ring, icon colour, pill/menu/dropdown/control radii, header height, horizontal spacing, shadow, backdrop. `--station-sidebar-bg` is the single application background. The Header nav pills use `--station-nav-*` tokens derived from the admin secondary (accent-outline) button style.
- `styles/admin-station.css` — token-driven layout and component styling.
- `styles/admin-station-responsive.css` — Header never wraps; pills scroll then hide (≤560px), leaving the slide menu as the complete navigation source.

Module entry `resources/ts/modules/admin-station.ts` registers `AdminStation` against the `compuzign-admin-station` shortcode mount and imports the three stylesheets; a Vite input in `vite.config.ts` emits `dist/js/admin-station.js` and `dist/css/admin-station.css`.

## Backend (WordPress)

- `src/Modules/AdminStation/AdminStationModule.php` — registers the `compuzign_admin_station` frontend shortcode and the `admin-station` health check; renders the mount div for logged-in platform managers (`AdminRouter::CAP`).
- `app/modules/admin-station/templates/admin-station.php` — outputs `<div id="compuzign-admin-station"></div>`.
- `src/Core/AssetLoader.php` — `registerAdminStationAssets()` registers the script/style on the frontend `wp_enqueue_scripts` hook; handle in `MODULE_HANDLES` (loads as an ES module).
- `src/Core/Plugin.php` — boots `AdminStationModule`.

## Related Code Maps

Consult these only when a specific area is later rebuilt inside the Admin Station: [Service Catalogue](service-catalogue.md), [Package Manager](package-manager.md), [Lifecycle and Module State](lifecycle-system.md).
