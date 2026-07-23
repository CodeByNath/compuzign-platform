# Station Manager

Station Manager is the coordinator for the peer Station frontend. It owns registration contracts, resolvers, ordering, boot/finalize, runtime surface composition, record-identity transport, and retained collections. It owns no UI primitive, template implementation, domain data, persistence, lifecycle, pricing, or drawer editing logic.

Root: `wp-content/plugins/compuzign-platform/resources/ts/station-manager/`

## Registration API

- [navigation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/station-manager/registry/navigation.ts) registers navigation and resolves order-sorted header/menu rows.
- [destinations.ts](../../wp-content/plugins/compuzign-platform/resources/ts/station-manager/registry/destinations.ts) registers destination projections and resolves activation keys.
- [surfaceBindings.ts](../../wp-content/plugins/compuzign-platform/resources/ts/station-manager/registry/surfaceBindings.ts) registers presentation bindings, resolves stable order-sorted placement rows, and holds the Admin-authored default Home value.
- [dataSources.ts](../../wp-content/plugins/compuzign-platform/resources/ts/station-manager/registry/dataSources.ts), [templateKits.ts](../../wp-content/plugins/compuzign-platform/resources/ts/station-manager/registry/templateKits.ts), and [drawerTemplates.ts](../../wp-content/plugins/compuzign-platform/resources/ts/station-manager/registry/drawerTemplates.ts) register and resolve read hooks, presentation contracts, and owning-Station drawer contracts.
- [StationSurfaceHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/station-manager/StationSurfaceHost.tsx) resolves one binding into its source hook and kit, then transports native-id intents and the originating wall's refresh handle.
- [drawerTypes.ts](../../wp-content/plugins/compuzign-platform/resources/ts/station-manager/drawerTypes.ts), [recordIdentity.ts](../../wp-content/plugins/compuzign-platform/resources/ts/station-manager/recordIdentity.ts), and [useRetainedCollection.ts](../../wp-content/plugins/compuzign-platform/resources/ts/station-manager/useRetainedCollection.ts) are shared coordinator contracts/infrastructure.

## Exact boot order

[modules/admin-station.ts](../../wp-content/plugins/compuzign-platform/resources/ts/modules/admin-station.ts) synchronously calls:

```text
registerServiceStation()
→ registerPackageStation()
→ registerAdminStation()
→ registerPresentationPolicy()
→ finalizeStationRegistry()
→ runtime registry.register(AdminStation)
```

[boot.ts](../../wp-content/plugins/compuzign-platform/resources/ts/station-manager/registry/boot.ts) locks navigation, destinations, bindings, sources, kits, and drawers; builds indexes; asserts every binding source/kit and navigation destination resolves; then enables every public resolver. A second finalize throws.

## Invariants

- Peer `register.ts` files are entry-only. Registration finishes before finalize; resolvers are never called at module scope and throw before successful finalization.
- Duplicate keys/projections and post-finalize registration throw. Navigation and bindings sort by declared `order`, with registration order as the stable tie-breaker.
- Unknown data sources/kits throw. Unmapped destinations and drawers intentionally resolve to `null`; drawer resolvability is not strengthened at finalize.
- Service and Package register owned capabilities. Admin registers its capabilities and authors all placement policy by string key. Manager imports only Preact, the type-only drawer-kit shell contract, and itself—never a peer or Admin Station.
- Record ids remain native `string | number`; no coordinator boundary coerces them.

`category-group-cards` is an Admin-owned presentation capability registered by `registerAdminStation()`, but it is load-bearing for the Package Families wall. If it is absent, binding-to-kit validation throws before mount.

## Reserved seams

Tool identity, `StationConditions` availability evaluation, per-entity activation, frontend permission granularity, and skill/AI-capability/connector registries are documentation-only seams. Build none without a real consumer. Capability lifecycle is registered → available to a Station → activated for an owning entity; any activation record belongs in that entity's owning Station storage, never generic Manager storage.

## Related Code Maps

[Admin Station](admin-station.md), [Surface Binding](admin-station-surface-binding.md), [Service Station](service-station.md), [Package Station](package-station.md), and [Drawer System](drawer-system.md).
