# Admin Station

The Admin Station is a **new, independent administration environment**, built fresh rather than migrated from the existing admin. Its structure is:

```
AdminStation
├── Header
├── Body
│   └── Home shell (station-agnostic template)
│       ├── Presentation region   (bounded height; inner content scrolls)
│       └── Station-group region  (dynamic tabs + active group panel; panel scrolls)
└── Footer    (empty)
+ a left slide-menu overlay opened from the Header
```

There is no fixed sidebar column. Business areas will be built fresh inside it, one at a time, only when explicitly specified; the old implementation is inspected only to preserve required behaviour, contracts, validation, permissions, and downstream data shapes — never moved into this tree.

## Boundary

Shares only **platform infrastructure** with the existing system: WordPress plugin boot, capability checks, asset registration/loading, and Vite/build infrastructure. It must **not** import the existing admin app tree or shell, Station Manager, Service/Package/Promotion components, business hooks, the old entity/station registries, relation providers, drawer builders, or old UI state.

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
- `shell/AdminStationBody.tsx` — hosts the Home shell. Currently passes **neutral development placeholders** (not station content) so layout, overflow, and responsiveness are observable; the first station replaces that block. `shell/AdminStationFooter.tsx` — empty semantic container.
- `home/stationHome.ts` — the Home shell contract. `AdminStationPresentation` (all fields optional: `eyebrow`/`title`/`description` as text, `status`/`actions`/`visual`/`summary`/`content` as nodes) and `AdminStationGroup` (`id`, `label`, `icon?`, `content: VNode`, `disabled?`). `resolveActiveGroupId()` derives the active group — requested if present and enabled, else the first enabled group, else `null`.
- `home/AdminStationHome.tsx` — composes the two regions inside the centred, width-bounded twelve-column grid. **Station-agnostic**: everything rendered arrives through the contract; no station is connected yet.
- `home/AdminStationPresentation.tsx` — presentation container. Renders only what it is handed and does not know which station is active. Its framing row (eyebrow/title/status/actions) is fixed and only `__content` scrolls, so station controls stay reachable. Neutral empty state when nothing is supplied.
- `home/AdminStationGroups.tsx` — dynamic tabs + active panel. Full tab semantics (`tablist`/`tab`/`tabpanel`, `aria-selected`, `aria-controls`, `aria-labelledby`, `useId`-scoped ids, roving tabindex). **Automatic activation**: Left/Right/Home/End move focus and select in one step, skipping disabled groups. The active group is derived on every render, never mirrored into state, so a changed configuration cannot leave a stale or invalid selection. Empty collection renders no tablist (invalid semantics) and invents no default tabs; all-disabled renders tabs with a neutral empty state.
- `shell/icons.tsx` — local icon set using the repository SVG system (Heroicons v2 solid, 24×24, `currentColor`): menu, Services/Packages/Promotions (reusing the repo `catalog`/`package`/`featured` paths), sun, moon, apps, user.
- `styles/admin-station-tokens.css` — scoped light/dark tokens: app/header/surface/elevated backgrounds, text, muted text, border, hover/active bg, focus ring, icon colour, pill/dropdown/control radii, header height, horizontal spacing, nav offset, shadow, backdrop, plus the theme-independent Home shell layout set (`--station-shell-height`, `--station-content-max`, `--station-grid-columns`, `--station-grid-gap`, `--station-body-pad`, `--station-body-pad-sm`) and the bounded presentation heights (`--station-presentation-min-height`, `--station-presentation-preferred-height`, `--station-presentation-max-height`). `--station-sidebar-bg` is the single application background. The Header nav pills use `--station-nav-*` tokens derived from the admin secondary (accent-outline) button style. The slide menu is square-cornered (no radius token).
- `styles/admin-station.css` — token-driven layout and component styling.
- `styles/admin-station-responsive.css` — Header never wraps; pills scroll then hide (≤560px), leaving the slide menu as the complete navigation source. Home gutters drop to `--station-body-pad-sm` at ≤767px; the breakpoint is a raw value because custom properties are not valid in a media query prelude.

### Home shell layout and scroll ownership

The shell is **bounded to the viewport** (`--station-shell-height` on `.cz-admin-station`, `overflow: hidden`) rather than growing with its content. The Header, presentation, and group tabs therefore hold their place structurally, and **no region uses `position: sticky`** — there is no page scroll for it to stick against, so no sticky offset or z-index is needed.

Scroll owners — exactly two, and they never compete:

- `.cz-station-groups__panel` — the single vertical scroll owner of the Admin Station body. Group panels are not given fixed heights or independent scrollbars; the one panel scrolls because it is the flex remainder.
- `.cz-station-presentation__content` — scrolls only its own overflow, inside the bounded presentation height, leaving the presentation framing fixed.

`minmax(0, 1fr)` on the grid row and `min-height: 0` down the flex/grid descendants are what let those regions overflow instead of stretching the shell.

The presentation height is `clamp(--station-presentation-min-height, --station-presentation-preferred-height, --station-presentation-max-height)`: the preferred value (~30dvh) squeezes with the viewport while the min stops it collapsing on short screens and the max stops it sprawling on tall ones.

**Ownership boundary**: the shell owns layout, bounded height, overflow, active-group selection, keyboard interaction, accessibility, and empty states. Stations will own presentation content, group definitions and order, panel content, loading/error state, data, and persistence. The shell holds no station business state and imports no station module.

Module entry `resources/ts/modules/admin-station.ts` registers `AdminStation` against the `compuzign-admin-station` shortcode mount and imports the three stylesheets; a Vite input in `vite.config.ts` emits `dist/js/admin-station.js` and `dist/css/admin-station.css`.

## Backend (WordPress)

- `src/Modules/AdminStation/AdminStationModule.php` — registers the `compuzign_admin_station` frontend shortcode and the `admin-station` health check; renders the mount div for logged-in platform managers (`AdminRouter::CAP`).
- `app/modules/admin-station/templates/admin-station.php` — outputs `<div id="compuzign-admin-station"></div>`.
- `src/Core/AssetLoader.php` — `registerAdminStationAssets()` registers the script/style on the frontend `wp_enqueue_scripts` hook; handle in `MODULE_HANDLES` (loads as an ES module).
- `src/Core/Plugin.php` — boots `AdminStationModule`.

## Related Code Maps

Consult these only when a specific area is later rebuilt inside the Admin Station: [Service Catalogue](service-catalogue.md), [Package Manager](package-manager.md), [Lifecycle and Module State](lifecycle-system.md).
