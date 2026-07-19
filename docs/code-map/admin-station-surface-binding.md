# Admin Station Surface Binding

The dynamic station/placement → presentation projection engine. It composes live walls without shell-level entity branching.

Root: `wp-content/plugins/compuzign-platform/resources/ts/admin-station/`

## Runtime chain

```text
active station + placement
  → resolveSurfaceBindings() returns ordered walls
  → StationSurfaceHost resolves dataSourceKey + templateKitKey
  → read hook supplies { items, loading, error, refetch }
  → kit emits native-identity actions
  → Body dispatches intent + that wall's refetch handle
  → registered drawer adapter
```

A placement may contain several ordered walls. Services currently presents the Service Catalogue followed by Package Families. The former Service Category carousel, Service card wall, and Package Tier wall remain registered but unbound for later placements.

## Authoritative files

- `stations/surfaceBindings.ts` — declarative binding rows, action intents, optional drawer key, structural guard, and resolver.
- `stations/dataSources.ts` — read-hook registry for the Service Catalogue, Package Families, Service Categories, Service cards, and Tiers.
- `stations/recordIdentity.ts` — zero-dependency `StationRecordId = string | number`.
- `presentation/templateKits.tsx` — kit registry for the Service Catalogue, full card grids, and compact Category carousel.
- `stations/StationSurfaceHost.tsx` — generic source/kit composer and resolvability guard.
- `stations/useRetainedCollection.ts` — wall-local stale-while-revalidate behavior.
- `shell/AdminStationBody.tsx` — renders each resolved presentation binding and forwards intents to the drawer.

## Invariants

- The shell never branches on entity; adding a wall changes a binding plus a real source/kit registration.
- A source hook is stable per mounted host; the host key includes its `dataSourceKey`.
- Refresh is structural and targeted: the opening wall supplies the only refetch handle invoked after mutation.
- Record ids remain native. Package Family and Tier ids are strings; Category and Service ids are numbers. The host neither parses nor coerces them.
- Bindings import no Command Centre runtime module.
- Only surfaces with real sources and kits are bound. Registered but unbound sources remain reusable.

## Drawer boundary

`ResolvedStationIntent` carries the native `recordId`, resolved intent, and `drawerTemplateKey` into the shared [Admin Station Drawer](admin-station-drawer.md). Action-to-tab mapping lives in binding `actionIntents`; the deleted `categoryGroupDrawer.ts` seam must not return.

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Admin Station](admin-station.md), [Navigation](admin-station-navigation.md), [Cards](admin-station-cards.md), and [Drawer](admin-station-drawer.md).
