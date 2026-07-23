# Admin Station Navigation & Destination Resolver

How the Admin Station turns a nav selection into a resolved destination. Part of the [Admin Station](admin-station.md) subsystem. There is **no URL router**: the front of the chain is an **activation key**, never a URL route. A router can later resolve into the same destination id without changing this engine.

Root: `wp-content/plugins/compuzign-platform/resources/ts/station-manager/registry/`

## Navigation source

- `navigation.ts` — the single registered navigation index driving both the Header pills and slide menu through `headerNavItems()` / `menuNavItems()`. Each `StationNavItem` keeps `id`, `label`, `icon`, `activationKey`, visibility flags, and `order`. Service, Package, and Admin register their own rows before finalization.

Selection flows `Header/SlideMenu onSelect(item.id)` → `AdminStationLayout.handleSelect` → context `navigate(id)`, which records `activeDestinationId`.

## Destination resolver

- `destinations.ts` — registers and resolves activation keys to `StationDestination`. `AdminStationContext` resolves `activeDestinationId` to `activeDestination`; the resolver selects identity/placement but renders nothing itself.

Chain: `activation key → resolveDestination() → registration (stationId + surfaceId) → placement → mode → conditions / record id → shell region`.

```ts
StationDestination = {
  id; stationId; surfaceId;
  placement: 'presentation' | 'body' | 'drawer';
  mode: ShellMode;           // viewpoint (type-only import; see Boundary note)
  conditions?: StationConditions;
}
StationConditions = { scope?; recordId?; categoryTermId?; relatedTo?: { entity; id } }
```

`resolveDestination(activation)` is a lookup in the finalized destination index, returning `null` for a null/unmapped key (the shell then falls back to Home). It holds **no entity logic**.

The three peer registration files map their nav items to `placement: 'body'`, `mode: 'table'`, `conditions.scope: 'current'`, `surfaceId: 'catalog'` — declaration only, inert until projection exists.

## Invariants

- **`stationId` values are registry-native** (`services`/`packages`/`promotions`), **not** old-registry ids (`service-catalog`/`package-manager`).
- **Lean registrations + a separate resolver table.** The resolver selects registrations; it never branches on entity.
- **`conditions` is not the runtime `MountCondition`.** `MountCondition` resolves *where* the app mounts in the DOM; `StationConditions` resolves *what data* a surface shows. Different axis — do not merge.
- **Record identity stays native** — each entity keeps its own real id (`StationRecordId = string | number`: numeric term_id, string group_id), converted in neither direction and never a surrogate display key. See [Record identity](admin-station-cards.md#record-identity).
- **Boundary note:** the one cross-tree reference is a type-only `import type { ShellMode }` from `drawer-kit/schema/types` — erased at build (verified: no `components/admin` runtime tokens in `admin-station.js`), the same sanctioned contract-crossing as `presentation/category-groups/types.ts` type-importing `ModuleNote`.

## Authoring guard

`registerDestinations()` throws on duplicate destination ids or fully-identical projections. `finalizeStationRegistry()` also asserts every navigation `activationKey` resolves before mount. The same surface at a different placement, mode, or scope remains deliberate.

## Projection status

The [Surface Binding](admin-station-surface-binding.md) table binds placement regions to data-source/template-kit keys and action intents—not a fixed `EntitySchema`. Services currently projects Package Family, Category, Service, and Tier presentation walls; actions open the shared [Admin Station Drawer](admin-station-drawer.md) with native identity, and saves refresh the originating wall. Destination-declared body tables remain unprojected.

The axes remain distinct: `registry/destinations.ts` resolves a nav *activation* to a destination; `registry/surfaceBindings.ts` resolves a station *placement* to a live presentation surface. Peer `register.ts` files author definitions, while Admin's `registerPresentationPolicy()` authors binding rows.

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Admin Station](admin-station.md), [Admin Station Cards](admin-station-cards.md).
