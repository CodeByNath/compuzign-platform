# Admin Station Surface Binding

The **dynamic destination → template projection engine**: how the Admin Station turns an active station's placement region into a live surface without the shell branching on entity. Part of the [Admin Station](admin-station.md) subsystem; sits between the [Navigation & Destination Resolver](admin-station-navigation.md) (which resolves *where/what data*) and the [Cards](admin-station-cards.md) (one template kit).

Root: `wp-content/plugins/compuzign-platform/resources/ts/admin-station/`

## The chain

```
active destination (station) + placement
  → resolveSurfaceBinding(stationId, placement)
    → binding: dataSourceKey + templateKitKey + conditions + actionIntents
      → StationSurfaceHost resolves the two keys and composes them
        → data source hook supplies { items, loading, error }
          → template kit loops + prints, emits numeric intents
            → Body's intent seam (inert until the drawer, Phase 3)
```

## Authoritative files

- `stations/surfaceBindings.ts` — the **binding table** (data only) plus its structural guard and `resolveSurfaceBinding`. Each row binds one `stationId + surfaceId + placement` to a `dataSourceKey`, a `templateKitKey`, optional `conditions`, `actionIntents` (`{ id, target: 'drawer', mode: 'view' | 'edit' }` — entity-agnostic), and an optional `drawerTemplateKey` (the drawer a dispatched intent opens). `DEFAULT_HOME_STATION` names the station whose presentation wall the Home body shows when no destination is active. `assertBindingsWellFormed` throws at load on a duplicate `station::surface::placement`.
- `stations/dataSources.ts` — `DataSourceKey → read hook` registry. Every source returns `SurfaceCollection<Item>` (`items/loading/error/refetch`); the item type is widened to `unknown` at this registry seam (a binding pairs a source with a kit that narrows it). Sources are pure reads — registering one pulls no old UI.
- `presentation/templateKits.tsx` — `TemplateKitKey → kit` registry. A kit is pure presentation: it takes the collection + an intent dispatcher, narrows `unknown[]` to its item type, loops, and forwards each action as `onIntent(recordId, actionId)`. `CategoryGroupCardsKit` wraps the existing card grid.
- `stations/StationSurfaceHost.tsx` — the **generic composer**. Resolves both keys, calls the one data-source hook, renders the kit, and maps a dispatched `actionId` to the binding's intent → `ResolvedStationIntent { recordId, intent }`. `assertBindingsResolvable` throws at load if any binding names a source/kit the registries lack (fails loudly, not silently blank).
- `shell/AdminStationBody.tsx` — resolves `activeDestination?.stationId ?? DEFAULT_HOME_STATION` at the `presentation` placement and renders the host; supplies the inert intent seam.

## Invariants

- **The shell never branches on entity.** It prints whatever kit a binding names. Adding a presentation surface is one binding row (+ a data source, + a kit if new) — no shell edit.
- **Not the dropped `stationId + surfaceId → EntitySchema`.** Bindings hold *keys* resolved at mount, never a fixed entity schema, and value-import no old renderer (bundle stays isolated; madge baseline of four `components/admin` cycles unchanged).
- **Rules of Hooks.** The host calls exactly one data-source hook; Body mounts it with a `key` of `stationId:surfaceId` so a resolved source is stable per mount and never swaps under a live instance.
- **Numeric identity end-to-end.** Intents carry `recordId: number` (the `term_id`) to the drawer boundary — never stringified.
- **No invented rows.** Only surfaces with a real data source and kit are bound; Packages/Promotions presentation walls are deliberately absent and resolve to the shell's empty state.

## Drawer

The drawer target is now **live**: a dispatched `ResolvedStationIntent` (numeric `recordId`, resolved `intent`, `drawerTemplateKey` from the binding) opens the shared [Admin Station Drawer](admin-station-drawer.md). The old `categoryGroupDrawer.ts` seam was deleted — the action→tab mapping lives only in `actionIntents`.

## Related Code Maps

[Admin Station](admin-station.md), [Navigation & Destination Resolver](admin-station-navigation.md), [Cards](admin-station-cards.md).
