# Admin Station Styles

The Admin Station uses scoped station tokens plus the shared drawer stylesheet. Theme selectors remain under `.cz-admin-station`, so the surrounding WordPress page and Command Centre do not inherit station visuals.

## Authoritative files

- `resources/ts/admin-station/styles/admin-station-tokens.css` — light/dark station tokens.
- `resources/ts/admin-station/styles/admin-station.css` — shell, navigation, cards, Service Catalogue, carousel, the Tier Workspace Engine's Tier Tabs → Focused Tier → Family Group composition (one flat three-column grid; the `__primary`/`__focus` wrappers are `display: contents` so the tabs, focused-Tier detail, and Family group are direct grid items), the engine's lower deck (`cz-tier-workspace__lower*`: underline tabs plus the labelled focused-scope line, `__rs-*` compact Rate Sheet rows/toolbar/summary/coverage sections, `__settings*` action rows, `__state*` deliberate empty states, `__firstuse` engine first-use block), and Admin-only drawer overlay/header/footer-band chrome.
- `resources/ts/admin-station/styles/admin-station-responsive.css` — responsive shell/card/catalogue/Tier-workspace/drawer rules; the Tier workspace collapses its three columns to two at a component 1100px breakpoint (Tier Tabs + focused Tier, Family group full-width below), then to a single column preserving the reading order at the existing 767px shell breakpoint.
- `resources/css/modules/drawer-kit.css` — shared modules, status pills, notification panels, forms, inline editors, dialogs, module actions, and record footers. `.cz-admin-station`-scoped adaptations give shared compositions the newer Admin Station module/editor treatment while leaving Command Centre unchanged.

`resources/ts/modules/admin-station.ts` emits `dist/css/admin-station.css`. Vite builds `drawer-kit.css` as its own stable entry; `Core/AssetLoader.php` registers it once and makes both page styles depend on it.

## Drawer styling boundary

The one Admin Station shell owns the fixed layer, backdrop, width, header, scroll body, and pinned footer band. Entity content uses only drawer-kit primitives. The removed transitional `cz-record-drawer__*` style system no longer competes with mature modules.

Admin Station host adaptations in `drawer-kit.css` provide:

- sticky Overview/Connections tabs;
- rounded dark module cards with blue accents;
- inline (module-local) editors so sibling modules remain readable;
- pinned record footer normalization;
- station-token form fields and notification panels.

These overrides always begin with `.cz-admin-station`; unscoped drawer-kit rules preserve Command Centre.

## Responsive rules

- Home gutters/card columns and the Service Catalogue table change at 767px.
- Carousel sizing uses 768px; header pill compaction uses 720px.
- At 560px the header pills hide and the drawer becomes full viewport width.
- Shared record footers wrap at the existing 480px drawer-kit breakpoint.

## Validation

From the plugin root: `npm run build`, `npm run docs:check`, and browser inspection when a WordPress runtime is available.

## Related Code Maps

[Admin Station](admin-station.md), [Admin Station Drawer](admin-station-drawer.md), [Admin Station Cards](admin-station-cards.md).
