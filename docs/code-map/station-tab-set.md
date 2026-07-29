# Station Tab Set

## Purpose and ownership

One generic tab system for lanes presented inside a station wall. Admin Station owns it as shell presentation; consuming it transfers no domain authority, and a consuming station owns only its own lane definitions and panel content.

Root: [StationTabSet.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/presentation/StationTabSet.tsx)

It is not the station-group region. [AdminStationGroups.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/home/AdminStationGroups.tsx) remains the station-level tabs described in [Admin Station Home Shell](admin-station-home-shell.md); this primitive is for lanes within one wall.

## What it owns

- Tab and panel ids scoped to one instance, so two decks on a page cannot collide.
- One roving tab stop across the strip.
- Arrow/Home/End movement with automatic activation, skipping disabled tabs.
- Disabled tabs the pointer cannot activate either.
- Matching `tablist` / `tab` / `tabpanel` relationships with `aria-selected`, `aria-controls`, `aria-labelledby`, and an `aria-label` on the strip.
- Every panel rendered, unselected ones `hidden`, so a lane keeps its state while another is shown.

It imports only Preact. It names no station, entity, drawer route, data source, or lane meaning. The selected id is the caller's state, every panel body is the caller's markup, and `renderTab` lets a caller supply richer tab content without this file learning what that content means.

## Consumers

- **Package Home** — [TierTabSet.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierTabSet.tsx) is the Package-owned skin over the primitive. It keeps the three deck variants (`deck`, `nested`, `selectors`) and the compact selector card. The Tier lower deck, its context bar, Connections, and Settings stay Package-owned; see [Tiers](tiers.md).
- **Service Home** — [ServiceLowerDeck.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/presentation/ServiceLowerDeck.tsx) is Service-owned composition. `Details` holds the existing Service Catalogue, handed the template-kit props unchanged; `Connections` renders Service's own read-only Category-connections lane and `Settings` renders Service's own two creation launchers (Create Service, Create Category). See [Service Catalogue](service-catalogue.md).

Neither station's lane content, deck layout, rows, or models are shared. Only the tab behaviour is.

## Skin

`cz-station-tabset__list`, `__tab`, `__panel` are the default skin: an underlined strip over one visible panel, declared before every station's feature CSS so an equal-specificity station rule wins on source order. A caller substitutes its own class name per element, so a station skin *replaces* the default rather than fighting it. The `[hidden]` panel reset is the one rule that outranks a station skin. See [Admin Station Styles](admin-station-styles.md).

## Validation

From the plugin root: `npm run contract:station-tabset`, `npm run contract:package-tier-workspace`, `npm run contract:admin-station-css`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`. Keyboard, focus, and dark/light rendering need browser inspection when a WordPress runtime is available.

## Related Code Maps

[Admin Station](admin-station.md), [Admin Station Styles](admin-station-styles.md), [Admin Station Home Shell](admin-station-home-shell.md), [Service Catalogue](service-catalogue.md), and [Tiers](tiers.md).
