# Admin Station List System

## Purpose and ownership

One record-list surface for the whole Admin Station, declared in `resources/ts/admin-station/styles/admin-station.css` and named by both markup shapes that use it. Admin Station owns it as shell presentation; consuming it transfers no domain authority, and a consuming surface owns only its own column template and cell content.

## The two shapes

- **Table** — the Service Catalogue, `resources/ts/service-station/presentation/ServiceCatalogue.tsx`. Its `<thead>` supplies the column labels, so its cells carry none.
- **List** — the Package Station lower deck's Details, Connections and Settings lanes, `resources/ts/package-station/presentation/package-tier-workspace/`, and Service Home's own Connections and Settings lanes, `resources/ts/service-station/presentation/ServiceConnectionsLane.tsx` and `ServiceSettingsLane.tsx`. A list has no header row, so each cell carries its own label through `.cz-tier-deck__field-label` (Package) or `.cz-service-deck__field-label` (Service).

A list stays a list. No table markup crosses into the lower deck, and nothing that is not already a list is turned into one.

## What is shared, and what is not

Declared once, in the blocks the catalogue's table selectors and the `cz-station-list__*` selectors both name:

- cell padding, `text-align`, cell borders;
- the elevated cell background and muted cell colour;
- the row's start and end radii, taken by the first and last cell;
- the rhythm between rows, and the list's text colour and size.

Declared apart, because each shape needs its own:

- the layout engine — `border-collapse` / `border-spacing` for the table, `display: flex` with a token `gap` for the list;
- the column template each list owns: `.cz-station-list__row--details`, `--connection`, `--settings` (Package's own column counts), and `--service-connections`, `--service-settings` (Service's own, a different column count — a surface adds a selector to this family, it does not reuse another surface's template).

Every value is a `--station-*` token. A surface that needs the list adds its selector to these blocks; it does not author a second family.

## Cells

`.cz-station-list__cell` is the label/value default: a grid box that centres its own content, because a grid cell has no table box to centre it against. Two cells restate `display` for their own axis, which is why they need no wrapper element:

- identity — `TierDeckRowIdentity`, a flex row of icon and copy;
- actions — `.cz-tier-deck__row-actions`, a flex row aligned to the end.

The status pill sizes to its text and carries `justify-self: start`, so it sits inside a cell rather than being one.

## Stacked mode

Both shapes stack together at a 980px component breakpoint in `admin-station-responsive.css`. The catalogue table declares `min-width: 920px`, so stacking there retires the band in which it scrolled sideways inside its wrapper instead of collapsing. Stacked, the row rather than its cells becomes the card: the shared cell borders and radii are cleared for both shapes together and re-drawn as a single divider between stacked cells. The catalogue's cells then take their label from `data-label`; a deck cell already carries one.

## Retired

The lower deck's parallel `cz-tier-deck__list`, `__list--compact`, `__row`, `__row--connection`, `__row--compact`, `cz-tier-settings__row` and `cz-tier-deck__field--hide-sm` family re-authored this surface with its own borders, radii, a literal row gap and a narrow-width rule that hid data. It is deleted.

## Validation

Run `npm run contract:admin-station-css` (every declared class is emitted, and feature CSS paints no control), `npm run contract:package-tier-workspace-shell` (the deck's three lanes use the shared classes, bring across no table, and cannot reintroduce the retired names), `npm run contract:station-tabset` (Service Home's own Connections/Settings lanes use the shared classes and import no Package presentation), `npm run build`, and `npm run docs:check` from the plugin root. Browser inspection when a WordPress runtime is available.

## Related Code Maps

[Admin Station Styles](admin-station-styles.md), [Admin Station Cards](admin-station-cards.md), [Service Catalogue](service-catalogue.md), [Tiers](tiers.md), and [Package Home Settings](package-settings.md).
