# Admin Station Surface Binding

The dynamic station/placement → presentation projection engine. It composes live walls without shell-level entity branching.

Root: `wp-content/plugins/compuzign-platform/resources/ts/admin-station/`

## Runtime chain

```text
active station + placement
  → StationPresentationShell (one per Home)
  → resolveSurfaceBindings() returns walls sorted by declared order
  → StationSurfaceHost resolves dataSourceKey + templateKitKey
  → read hook supplies { items, loading, error, refetch, optional capability state }
  → kit emits native-identity actions
  → shell dispatches intent + that wall's refetch handle
  → registered drawer adapter
```

A placement may contain several ordered walls, rendered by the one presentation shell. Each binding declares a numeric `order`; the resolver sorts by it (stable sort, so registration order breaks ties). Service Home presents Package Families (order `0`) followed by the Service Catalogue (order `1`). Package capability definitions generate ordinary Package bindings in this same registry; their registry order is the section-order authority.

## Authoritative files

- `stations/surfaceBindings.ts` — declarative binding rows with numeric `order`, action intents, optional capability metadata/drawer override, structural guard, and order-sorting resolver.
- `stations/packageCapabilities/capabilityRegistry.ts` — lightweight Package composition definitions; Tier is the only current entry.
- `stations/StationPresentationShell.tsx` — the one ordered section loop. Entity-agnostic.
- `stations/dataSources.ts` — read-hook registry, including the condition-aware Package Tier collection.
- `stations/recordIdentity.ts` — native `StationRecordId` plus opaque serialisable parent/mutation context.
- `presentation/templateKits.tsx` — presentation-only kit registry, including the Tier collection kit.
- `stations/StationSurfaceHost.tsx` — generic source/kit composer, capability-assignment gate, and resolvability guard. Disabled capability content is not mounted; its host activation control remains available.
- `stations/useRetainedCollection.ts` — wall-local stale-while-revalidate behavior.
- `shell/AdminStationBody.tsx` — activates the station, hands one presentation shell to the Home, and forwards intents to the drawer.

## Invariants

- The shell never branches on entity; adding a wall changes a binding plus a real source/kit registration.
- Section sequence is the binding's declared `order`, never array position alone; the stable sort keeps registration order as the only tie-breaker.
- The Home renders exactly one presentation shell per active station; sections are never separate competing presentation regions.
- A source hook is stable per mounted host; the host key includes its `dataSourceKey`.
- Refresh is structural and targeted: the opening wall supplies the only refetch handle invoked after mutation.
- Record ids remain native. Package Family and Tier occupant ids are strings; Category and Service ids are numbers. Parent Service and Tier slot data travel in context, never as substitute identity.
- Bindings import no Command Centre runtime module.
- Only complete capabilities with a real source, kit, drawer composition, identity, and authority are registered. Promotion, Bundle, and Campaign are not placeholders.

## Drawer boundary

`ResolvedStationIntent` carries the native `recordId`, resolved intent, and `drawerTemplateKey` into the shared [Admin Station Drawer](admin-station-drawer.md). Action-to-tab mapping lives in binding `actionIntents`; the deleted `categoryGroupDrawer.ts` seam must not return.

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Admin Station](admin-station.md), [Navigation](admin-station-navigation.md), [Cards](admin-station-cards.md), and [Drawer](admin-station-drawer.md).
