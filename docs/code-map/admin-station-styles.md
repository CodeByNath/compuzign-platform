# Admin Station Styles

The scoped token system and styling for the Admin Station. Part of the [Admin Station](admin-station.md) subsystem. All token overrides are scoped by `data-station-theme` (light/dark) stamped on the `.cz-admin-station` root, so nothing leaks into the surrounding page and the tree never loads `admin.css`.

Root: `wp-content/plugins/compuzign-platform/resources/ts/admin-station/styles/`

## Files

- `admin-station-tokens.css` — scoped light/dark tokens.
- `admin-station.css` — token-driven layout and component styling.
- `admin-station-responsive.css` — the responsive rules.

The module entry `resources/ts/modules/admin-station.ts` imports all three so the bundler emits a single `dist/css/admin-station.css`.

## Token families

Theme-dependent (light/dark): app/header/surface/elevated backgrounds, text, muted text, border, hover/active bg, focus ring, icon colour, pill/dropdown/control radii, header height, horizontal spacing, nav offset, shadow, backdrop. `--station-sidebar-bg` is the single application background.

Theme-independent:

- **Home shell layout set** — `--station-shell-height`, `--station-content-max`, `--station-grid-columns`, `--station-grid-gap`, `--station-body-pad`, `--station-body-pad-sm`.
- **Accent family** — `--station-accent`, `--station-accent-strong`, `--station-accent-soft-bg`, `--station-accent-border`, `--station-accent-on`, `--station-accent-seam`. This is the source the `--station-nav-*` pills derive from.
- **Status families** — `--station-status-{active,pending,inactive}-{fg,bg,border}`.
- Card/metric/pill/control shape sets, the type scale (`--station-text-*`, `--station-tracking-*`, `--station-line-snug`), and the layering pair `--station-z-sticky` / `--station-z-dropdown`.

The slide menu is square-cornered (no radius token).

## Responsive rules

- The Header never wraps; pills scroll then hide (≤560px), leaving the slide menu as the complete navigation source.
- Home gutters drop to `--station-body-pad-sm` at ≤767px.
- Card grid cells claim twelve-column spans — 4 (three across) by default, 12 (one across) inside that same ≤767px block.

**Three breakpoints exist in total (767 / 720 / 560) and a component may not add a fourth**: the card grid reuses the shell's boundary rather than inventing one, and metric blocks reflow intrinsically (`auto-fit`) with no breakpoint at all. Breakpoint values are raw because custom properties are not valid in a media-query prelude; everything they change is token- or grid-driven.

## Related Code Maps

[Admin Station](admin-station.md), [Admin Station Home Shell](admin-station-home-shell.md), [Admin Station Cards](admin-station-cards.md).
