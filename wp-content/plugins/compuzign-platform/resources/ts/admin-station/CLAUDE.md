# Admin Station — Host Shell

Global policy is defined by [AGENTS.md](../../../../../../AGENTS.md).

## Ownership and entry points

`resources/ts/admin-station/` is the thin host shell. It renders the station frame and one drawer layer, and resolves everything else from the Station Manager registries. It owns no entity data, no mutations and no domain rules.

- `AdminStation.tsx`, `AdminStationContext.tsx` — root boundary, theme, active destination.
- `shell/AdminStationLayout|Header|Body|Footer|SlideMenu|Dropdown.tsx` — the station frame.
- `shell/PlatformIdentifierMigrationNotice.tsx` — temporary one-time Platform
  ID migration notice/trigger; remove after live verification.
- `api/platformIdentifiers.ts` — the ONE client for the existing
  `admin/platform-identifiers/migration` boundary. Owned here because that route
  belongs to `src/PlatformIdentifier`, not to any station's entities.
- `shell/drawer/AdminStationDrawer.tsx` — **the one drawer host**: layer, backdrop, panel, size modifier, header, scrolling body, footer band, scroll lock, Escape, focus restore, close guard, mode clamping, unresolved-key fallback. It never branches on entity type.
- `shell/drawer/AdminStationDrawerContext.tsx` — one open drawer: template key, opaque record id, mode, originating-wall refetch.
- `home/`, `presentation/` — the home shell and the station-level presentation primitives (status pill, metric block, split action, category-group cards, tab set).
- `presentation/StationTabSet.tsx` — **the one tab primitive** for lanes inside a wall: ids, roving focus, Arrow/Home/End movement, disabled tabs, and `tablist`/`tab`/`tabpanel` semantics. It imports only Preact and names no station, entity, drawer route, data source, or lane. Callers own the selected id, every panel body, and the class names. It is not the station-group region: `home/AdminStationGroups.tsx` remains the station-level tabs.
- `register.ts` — Admin Station navigation, destinations, kits, the Category and Request drawers, and the presentation action policy.
- `stations/requests/` — the Requests destination: `useRequestsCatalogue.ts` (data source, reads `RequestRepository` via `fetchAdminRequests()`), `RequestsCatalogueKit.tsx` (list), `RequestDrawerHost.tsx` (drawer content, `supportedModes: ['view']` only — no editor). CRM-1C added a pinned footer (`RequestDrawerFooter.tsx`, `RequestDrawerDialogs.tsx`, `useRequestDrawerActions.ts`) for Approve/Cancel Request (pending status only, see `AdminRequestsController::updateRequestStatus()`) and Print/Save PDF (all statuses). Print reuses the exact customer `QuoteProposalPreview` presentation (`requestLineToCartItem.ts` maps the durable snapshot's `RequestLine[]` to its `CartItem[]` prop) rendered into a genuinely isolated print window (`openIsolatedPrintDocument.ts`, `printRequestProposal.tsx`) — never the Admin Station page's own document — because `.cz-proposal`'s design tokens live only in `atomic-engine/css/00-tokens.css`; see the CRM-1C work file for the full bundle/style-boundary reasoning.
- `styles/` — see the ownership boundary below.

## Boundaries

Do not add a second drawer host, a second drawer registry, or a second field system. Drawer entry behaviour — how a drawer opens, which mode it opens in, and which size it takes — is fixed by the registration contract in `@/station-manager`.

Package Station and Service Station legitimately import `admin-station/presentation/` and `admin-station/shell/icons`. Nothing here may import a station's mutation hooks.

## Style ownership

`styles/admin-station-tokens.css` is the single token definition site for the Admin Station. Components reference tokens; they do not hard-code colour or shape.

The shell sheet owns station layout, header, navigation, body, footer, slide menu, presentation surfaces, station tabs, the drawer layer, backdrop, drawer placement, drawer widths and station breakpoints.

It does **not** own control appearance. Input, select, textarea, checkbox, label, hint, error, focus, disabled, readonly and field sizing belong to the drawer kit's field system (`cz-tf-*`). Feature CSS living in this sheet owns grids, rows, columns and domain-specific presentation only, and must not declare `border`, `border-radius`, `height`, `min-height`, `outline`, `box-shadow`, `background` or `color` on an `input`, `select`, `textarea`, `label` or a `cz-tf-*` class.

Read [Admin Station](../../../../../../docs/code-map/admin-station.md), [Admin Station Styles](../../../../../../docs/code-map/admin-station-styles.md), [Admin Station Drawer](../../../../../../docs/code-map/admin-station-drawer.md), and the locked [Admin Station Field System](../../../../../../docs/architecture/admin-station-field-system-v1.md).

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, `npm run contract:admin-station-css`, `npm run contract:station-tabset`, `npm run contract:requests-admin-station-surface`, `npm run contract:supported-action-footer`, `npm run contract:request-print-isolation`, `npm run contract:payment-summary-extraction-parity`, `npm run docs:check`.
