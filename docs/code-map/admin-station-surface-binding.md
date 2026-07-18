# Admin Station Surface Binding

The **dynamic destination → template projection engine**: how the Admin Station turns an active station's placement region into a live surface without the shell branching on entity. Part of the [Admin Station](admin-station.md) subsystem; sits between the [Navigation & Destination Resolver](admin-station-navigation.md) (which resolves *where/what data*) and the [Cards](admin-station-cards.md) (one template kit).

Root: `wp-content/plugins/compuzign-platform/resources/ts/admin-station/`

## The chain

```
active destination (station) + placement
  → resolveSurfaceBindings(stationId, placement)   → a LIST of walls
    → for each: dataSourceKey + templateKitKey + conditions + actionIntents + title?
      → StationSurfaceHost resolves the two keys and composes them
        → data source hook supplies { items, loading, error, refetch }
          → template kit loops + prints, emits identity-only intents
            → Body dispatches (intent, that wall's refetch) → shared drawer
```

**A placement holds many walls.** A region can stack several, each with its own data source, kit, action intents, and optional drawer; the Service home presentation region shows Package Families followed by Service Categories. Adding, reordering, or removing a wall is a row in the table — never an edit to the Body or host.

## Authoritative files

- `stations/surfaceBindings.ts` — the **binding table** (data only) plus its structural guard and `resolveSurfaceBindings`. Each row binds one `stationId + surfaceId + placement` to a `dataSourceKey`, a `templateKitKey`, optional `conditions`, `actionIntents`, and an optional drawer template. The Service presentation placement has two ordered walls: `package-families` (full cards + drawer) followed by `service-categories` (compact carousel, read-only). `BINDING_INDEX` maps `station::placement` → **a list**; `surfaceId` keeps walls distinct.
- `stations/dataSources.ts` — `DataSourceKey → read hook` registry: `package-families` → `usePackageFamilyCards`; `service-categories` → `useServiceCategoryCards`. Every source returns `SurfaceCollection<Item>` (`items/loading/error/refetch`). Sources are pure reads — registering one pulls no old UI.
- `stations/recordIdentity.ts` — the shell's one identity type (`StationRecordId = string | number`), zero-dependency so every layer can share it without a cycle.
- `presentation/templateKits.tsx` — `TemplateKitKey → kit` registry. `CategoryGroupCardsKit` wraps the full card grid; `ServiceCategoryCarousel` renders compact cube cards in a horizontal, scroll-snapped repeater with six visible on desktop.
- `stations/StationSurfaceHost.tsx` — the **generic composer**. Resolves both keys, calls the one data-source hook, renders the kit, and maps a dispatched `actionId` to the binding's intent → `ResolvedStationIntent { recordId, intent, drawerTemplateKey }`, dispatched **alongside this wall's own `refetch`**. `assertBindingsResolvable` throws at load if any binding names a source/kit the registries lack (fails loudly, not silently blank).
- `stations/useRetainedCollection.ts` — stale-while-revalidate for a wall. `useApi` resets to `{ data: null, loading: true }` on every `refetch()`, which would blank a wall to "Loading…" to show one changed card. This retains the last loaded collection during a **reload** (first loads report the real loading state), so a save-triggered refresh swaps data in place. Kept local to these sources rather than changed inside the shared `useApi`, which the old tree also uses.
- `shell/AdminStationBody.tsx` — resolves `activeDestination?.stationId ?? DEFAULT_HOME_STATION` at the `presentation` placement, maps **every** returned binding to a titled `.cz-station-wall` section, and passes `openFromIntent` as each host's dispatch.

## Invariants

- **The shell never branches on entity.** It prints whatever kit a binding names. Adding a presentation surface is one binding row (+ a data source, + a kit if new) — no shell edit.
- **Not the dropped `stationId + surfaceId → EntitySchema`.** Bindings hold *keys* resolved at mount, never a fixed entity schema, and value-import no old renderer (bundle stays isolated; madge baseline of four `components/admin` cycles unchanged).
- **Rules of Hooks.** The host calls exactly one data-source hook; Body mounts each wall with a `key` of `stationId:surfaceId:dataSourceKey` — the data source key is in the identity deliberately, since it decides *which* hook the host calls — so a resolved source is stable per mount and never swaps under a live instance.
- **Refresh is targeted, not broadcast.** A wall dispatches its own `refetch` with its intent; the drawer controller remembers that one handle and calls it on save. Editing a Package Family refreshes the Package Family wall and nothing else. There is no event bus and no registry to mis-key — the targeting is structural, so it stays correct whether the region holds one wall or several.
- **Native identity end-to-end.** Intents carry `recordId: StationRecordId` — the record's own id, numeric or string — to the drawer boundary, converted in neither direction. The host passes it straight through from the kit without inspecting it. See [Record identity](admin-station-cards.md#record-identity).
- **No invented rows.** Only surfaces with a real data source and kit are bound; Packages/Promotions presentation walls are deliberately absent and resolve to the shell's empty state.
- **A source stays registered when unbound.** Re-pointing a wall at a different entity is a key change in this table, never a code move.

## Drawer

The drawer target is now **live**: a dispatched `ResolvedStationIntent` (numeric `recordId`, resolved `intent`, `drawerTemplateKey` from the binding) opens the shared [Admin Station Drawer](admin-station-drawer.md). The old `categoryGroupDrawer.ts` seam was deleted — the action→tab mapping lives only in `actionIntents`.

## Related Code Maps

[Admin Station](admin-station.md), [Navigation & Destination Resolver](admin-station-navigation.md), [Cards](admin-station-cards.md).
