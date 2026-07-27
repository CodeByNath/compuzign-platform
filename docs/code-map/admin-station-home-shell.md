# Admin Station Home Shell

The station-agnostic Home template hosted in the Admin Station Body. Everything it renders arrives through a contract. Live surfaces are supplied by the Body; the Home shell itself holds no station business state and imports no station module.

Root: `wp-content/plugins/compuzign-platform/resources/ts/admin-station/home/`

## Contract and composition

- `stationHome.ts` — the Home shell contract. `AdminStationPresentation` (all fields optional: `eyebrow`/`title`/`description` as text, `status`/`actions`/`visual`/`summary`/`content` as nodes) and `AdminStationGroup` (`id`, `label`, `icon?`, `content: VNode`, `disabled?`). `resolveActiveGroupId()` derives the active group — requested if present and enabled, else the first enabled group, else `null`.
- `AdminStationHome.tsx` — composes the two regions inside the centred, width-bounded twelve-column grid. Station-agnostic.
- `AdminStationPresentation.tsx` — presentation container. Renders only what it is handed and does not know which station is active. Renders at its natural content height and contributes no scroll of its own. Neutral empty state when nothing is supplied. It has **no surface of its own** — no border, background, or radius — so the content it holds provides the visual grouping and the body reads as one continuous canvas; the framing contract is untouched and stays available to future stations.
- `AdminStationGroups.tsx` — dynamic tabs + active panel with full tab semantics (`tablist`/`tab`/`tabpanel`, `aria-selected`, `aria-controls`, `aria-labelledby`, `useId`-scoped ids, roving tabindex). **Automatic activation**: Left/Right/Home/End move focus and select in one step, skipping disabled groups. The active group is derived on every render, never mirrored into state, so a changed configuration cannot leave a stale or invalid selection. Empty collection renders no tablist (invalid semantics) and invents no default tabs; all-disabled renders tabs with a neutral empty state.

The Body supplies exactly one `admin-station/presentation/StationPresentationShell.tsx` as the presentation content. That shell resolves every section through `station-manager/registry/surfaceBindings.ts` — sorted by each binding's declared `order` — and renders each through `station-manager/StationSurfaceHost.tsx`, so the Home never receives pre-stacked competing regions. Service Home renders the titled Package Family card wall (order `0`) followed by the Service-owned lower deck (order `1`), whose `Details` lane holds the browse-first Service Catalogue. The Body supplies no groups, so the optional group region is not rendered. Entity authority stays outside both shells: the Home and presentation shell know sections only, never Service or Package Family.

Lanes inside a wall are not this region: `AdminStationGroups` is the station-level group region, while a station presenting lanes within one wall composes [Station Tab Set](station-tab-set.md) and owns its own lane definitions and panel content.

## Layout and scroll ownership

The whole body scrolls together as **one page**. `.cz-admin-station` sets `min-height: var(--station-shell-height)` as a viewport floor (so a short page still fills the screen) but is not otherwise bounded or clipped — it grows with its content, and there is exactly one scroll: the page's own.

Two regions hold their place via `position: sticky`, layered on `--station-z-sticky` (below `--station-z-dropdown` and the slide-menu layer, above ordinary content):

- `.cz-station-header` — `sticky; top: 0`. Stays visible as everything beneath it scrolls.
- `.cz-station-groups__tablist` — `sticky; top: var(--station-header-height)`. Sticks directly beneath the Header once the group tabs scroll up to meet it, so the active station's tabs stay reachable however far the panel runs.

Nothing else scrolls or sticks on its own. The presentation region and the group panel both render at natural content height and add to the page's total height. `grid-template-rows: auto auto` on `.cz-station-home` reflects this: both rows size to content.

## Ownership boundary

The shell owns layout, sticky Header/tab positioning, active-group selection, keyboard interaction, accessibility, and empty states. Stations will own presentation content, group definitions and order, panel content, loading/error state, data, and persistence.

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Admin Station](admin-station.md), [Admin Station Styles](admin-station-styles.md), [Admin Station Cards](admin-station-cards.md).
