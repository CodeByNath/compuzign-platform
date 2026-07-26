# Admin Station Styles

The Admin Station uses scoped station tokens plus the shared drawer stylesheet. Theme selectors remain under `.cz-admin-station`, so the surrounding WordPress page does not inherit station visuals.

## Authoritative files

- `resources/ts/admin-station/styles/admin-station-tokens.css` — the single Admin Station token definition site. Light/dark station tokens plus the field-system contract.
- `resources/ts/admin-station/styles/admin-station.css` — shell, navigation, cards, drawer layer/backdrop/panel/sizes, and the Station-level feature surfaces (Service Catalogue, Service Category card, Tier Workspace Engine, lower deck, Tier settings, Rate Sheet tool).
- `resources/ts/admin-station/styles/admin-station-responsive.css` — responsive shell, card, catalogue, Tier-workspace and drawer rules. The Tier workspace collapses three columns to two at a component 1100px breakpoint, then to a single column at the 767px shell breakpoint.
- `resources/css/modules/drawer-kit.css` — drawer content: modules, status pills, notification panels, **the shared field system**, inline editors, dialogs, module actions, and record footers.

`resources/ts/modules/admin-station.ts` emits `dist/css/admin-station.css` in the order tokens → base → responsive. Vite builds `drawer-kit.css` as its own stable entry; `Core/AssetLoader.php` registers it once and makes the Admin Station sheet depend on it, so drawer-kit always precedes the station sheet.

`.cz-admin-station` is the only live root for both sheets. The retired `.cz-admin-root` Command Centre root is emitted by no TypeScript or PHP file.

## Ownership boundary

Three owners, no overlap. See [Admin Station Field System](../architecture/admin-station-field-system-v1.md) for the full specification.

**Shell CSS** (`admin-station.css`, `admin-station-tokens.css`, `admin-station-responsive.css`) owns station layout, header, navigation, body, footer, slide menu, presentation surfaces, station tabs, the drawer layer, backdrop, drawer placement, drawer widths, station breakpoints, and every design token.

**Drawer/content CSS** (`drawer-kit.css`) owns drawer content sections, overview modules, field grids, field wrappers, labels, hints, control appearance, control states, control sizes, validation presentation, inline-edit layouts, and record footer contents.

**Feature CSS** owns only genuine domain layout: grids, rows, columns, specialised editor structures, relationship visualisation, and entity status presentation.

Feature CSS must not declare `border`, `border-radius`, `height`, `min-height`, `outline`, `box-shadow`, `background` or `color` on an `input`, `select`, `textarea`, `label` or a shared control class. Those belong to the field system. `scripts/admin-station-css-contract.mjs` enforces this.

## Field system

`cz-tf-*` in `drawer-kit.css` is the one Admin drawer field system: one wrapper (`.cz-tf-field`), one checkbox row inside it (`.cz-tf-field__inline`), one label (`.cz-tf-label`, with `--required`), one hint (`.cz-tf-hint`), one error (`.cz-tf-error`), and one control base (`.cz-tf-control`) specialised by `.cz-tf-input`, `.cz-tf-select`, `.cz-tf-textarea` and `.cz-tf-checkbox`. `.cz-tf-control__inner` is the bare input inside a composite control surface, such as the catalogue search.

Three sizes — `--sm`, default, `--lg` — and the states default / hover / focus-visible / disabled / readonly / error / required are declared once on the base and inherited by every type. The eight types and three sizes are twenty-four combinations built from one base, two size modifiers and shared tokens; they are not twenty-four implementations. No second field system may be created.

The checkbox is the one type that does not take the base: the base sets `appearance: none` so a select can carry its own chevron, which on a checkbox erases the native tick.

The default size is `--station-control-height`, so a field in a drawer and a filter on a station page are the same control. `--station-field-*` in the token file is the whole contract; every name is an alias over an existing station family or a 4px-rhythm value.

Editors render fields through `drawer-kit/fields/AdminField`, not hand-authored markup. Specialised editors — the Rate Sheet grid, the repeatable FAQ and inclusion collections, the transforming category control — keep their own layout and consume the shared control classes; they are not expressed as field definitions.

## Responsive rules

- Home gutters and card columns change at 767px; the Service Catalogue table collapses to stacked rows there.
- Header pill compaction uses 720px; at 560px the pills hide and the drawer becomes full viewport width.
- Shared record footers wrap at the drawer-kit 480px breakpoint.

## Validation

From the plugin root: `npm run build`, `npm run contract:admin-station-css`, `npm run docs:check`, and browser inspection when a WordPress runtime is available.

## Related Code Maps

[Admin Station](admin-station.md), [Admin Station Drawer](admin-station-drawer.md), [Admin Station Cards](admin-station-cards.md), [Drawer System](drawer-system.md).
