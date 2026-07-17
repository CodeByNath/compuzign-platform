# Admin Station

The Admin Station is a **new, independent administration environment**, built fresh rather than migrated from the existing admin. Its structure is:

```
AdminStation
├── Header
├── Body
│   └── Home shell (station-agnostic template)
│       ├── Presentation region   (Category Group card grid; natural height, no scroll of its own)
│       └── Station-group region  (dynamic tabs, sticky below the Header + active group panel)
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
- `shell/AdminStationBody.tsx` — hosts the Home shell. Supplies the presentation region with the **Category Group card grid** (mock data — see [Admin Station Cards](admin-station-cards.md)) and owns the card-action → drawer-request seam. Passes `content` only, so the shell renders no framing. Supplies **no groups**: the former placeholder tabs are gone (a labelled tab is indistinguishable from a real station group), so the group region falls to the shell's no-group empty state until a station owns it. `shell/AdminStationFooter.tsx` — empty semantic container.
- `home/stationHome.ts` — the Home shell contract. `AdminStationPresentation` (all fields optional: `eyebrow`/`title`/`description` as text, `status`/`actions`/`visual`/`summary`/`content` as nodes) and `AdminStationGroup` (`id`, `label`, `icon?`, `content: VNode`, `disabled?`). `resolveActiveGroupId()` derives the active group — requested if present and enabled, else the first enabled group, else `null`.
- `home/AdminStationHome.tsx` — composes the two regions inside the centred, width-bounded twelve-column grid. **Station-agnostic**: everything rendered arrives through the contract; no station is connected yet.
- `home/AdminStationPresentation.tsx` — presentation container. Renders only what it is handed and does not know which station is active. Renders at its natural content height and contributes no scroll of its own — it is part of the single page scroll the whole Home body shares. Neutral empty state when nothing is supplied. It has **no surface of its own** — no border, background, or radius — so the content it holds provides the visual grouping and the body reads as one continuous canvas; the framing contract is untouched and stays available to future stations.
- `home/AdminStationGroups.tsx` — dynamic tabs + active panel. Full tab semantics (`tablist`/`tab`/`tabpanel`, `aria-selected`, `aria-controls`, `aria-labelledby`, `useId`-scoped ids, roving tabindex). **Automatic activation**: Left/Right/Home/End move focus and select in one step, skipping disabled groups. The active group is derived on every render, never mirrored into state, so a changed configuration cannot leave a stale or invalid selection. Empty collection renders no tablist (invalid semantics) and invents no default tabs; all-disabled renders tabs with a neutral empty state.
- `shell/icons.tsx` — local icon set using the repository SVG system (Heroicons v2 solid, 24×24, `currentColor`): menu, Services/Packages/Promotions (reusing the repo `catalog`/`package`/`featured` paths), sun, moon, apps, user, chevron-down, view.
- `styles/admin-station-tokens.css` — scoped light/dark tokens: app/header/surface/elevated backgrounds, text, muted text, border, hover/active bg, focus ring, icon colour, pill/dropdown/control radii, header height, horizontal spacing, nav offset, shadow, backdrop, plus the theme-independent Home shell layout set (`--station-shell-height`, `--station-content-max`, `--station-grid-columns`, `--station-grid-gap`, `--station-body-pad`, `--station-body-pad-sm`). `--station-sidebar-bg` is the single application background. The accent family (`--station-accent`, `--station-accent-strong`, `--station-accent-soft-bg`, `--station-accent-border`, `--station-accent-on`, `--station-accent-seam`) is theme-independent and is the source the `--station-nav-*` pills now derive from. Also holds the status families (`--station-status-{active,pending,inactive}-{fg,bg,border}`), the card/metric/pill/control shape sets, the type scale (`--station-text-*`, `--station-tracking-*`, `--station-line-snug`), and the layering pair `--station-z-sticky` / `--station-z-dropdown`. The slide menu is square-cornered (no radius token).
- `styles/admin-station.css` — token-driven layout and component styling.
- `styles/admin-station-responsive.css` — Header never wraps; pills scroll then hide (≤560px), leaving the slide menu as the complete navigation source. Home gutters drop to `--station-body-pad-sm` at ≤767px. Card grid cells claim twelve-column spans — 4 (three across) by default, 12 (one across) inside that same existing ≤767px block. **Three breakpoints exist in total (767/720/560) and a component may not add a fourth**: the card grid reuses the shell's boundary rather than inventing one, and metric blocks reflow intrinsically (`auto-fit`) with no breakpoint at all. Breakpoint values are raw because custom properties are not valid in a media query prelude; everything they change is token- or grid-driven.

### Home shell layout and scroll ownership

The whole body scrolls together as **one page**. `.cz-admin-station` sets `min-height: var(--station-shell-height)` as a viewport floor (so a short page still fills the screen) but is no longer bounded or clipped (`overflow: hidden` is gone) — it grows past that floor with its content, and there is exactly one scroll: the page's own.

Two regions hold their place in that scroll via `position: sticky`, layered on `--station-z-sticky` (below `--station-z-dropdown` and the slide-menu layer, above ordinary content):

- `.cz-station-header` — `position: sticky; top: 0;`. Stays visible at the top of the page as everything beneath it scrolls.
- `.cz-station-groups__tablist` — `position: sticky; top: var(--station-header-height);`. Sticks directly beneath the Header once the group region's tabs scroll up to meet it, so the active station's tabs stay reachable however far the panel content runs.

Nothing else scrolls or sticks on its own. The presentation region and the group panel both render at their natural content height and simply add to the page's total height — the old bounded-height clamp and the two independent inner scrollers (`__content`, `__panel`) are gone. `grid-template-rows: auto auto` on `.cz-station-home` reflects this: both rows size to content rather than one claiming the flex remainder.

**Ownership boundary**: the shell owns layout, sticky Header/tab positioning, active-group selection, keyboard interaction, accessibility, and empty states. Stations will own presentation content, group definitions and order, panel content, loading/error state, data, and persistence. The shell holds no station business state and imports no station module.

Module entry `resources/ts/modules/admin-station.ts` registers `AdminStation` against the `compuzign-admin-station` shortcode mount and imports the three stylesheets; a Vite input in `vite.config.ts` emits `dist/js/admin-station.js` and `dist/css/admin-station.css`.

## Backend (WordPress)

- `src/Modules/AdminStation/AdminStationModule.php` — registers the `compuzign_admin_station` frontend shortcode and the `admin-station` health check; renders the mount div for logged-in platform managers (`AdminRouter::CAP`).
- `app/modules/admin-station/templates/admin-station.php` — outputs `<div id="compuzign-admin-station"></div>`.
- `src/Core/AssetLoader.php` — `registerAdminStationAssets()` registers the script/style on the frontend `wp_enqueue_scripts` hook; handle in `MODULE_HANDLES` (loads as an ES module).
- `src/Core/Plugin.php` — boots `AdminStationModule`.

## Related Code Maps

[Admin Station Cards](admin-station-cards.md) — the presentation card system and the Category Group card grid the presentation region renders.

Consult these only when a specific area is later rebuilt inside the Admin Station: [Service Catalogue](service-catalogue.md), [Package Manager](package-manager.md), [Lifecycle and Module State](lifecycle-system.md).
