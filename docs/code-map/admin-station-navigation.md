# Admin Station Navigation & Destination Resolver

How the Admin Station turns a nav selection into a resolved destination. Part of the [Admin Station](admin-station.md) subsystem. There is **no URL router**: the front of the chain is an **activation key**, never a URL route. A router can later resolve into the same destination id without changing this engine.

Root: `wp-content/plugins/compuzign-platform/resources/ts/admin-station/navigation/`

## Navigation source

- `stationNavigation.ts` — the **single navigation source** driving both the Header pills and the slide menu, so the two can never drift. Each `StationNavItem` has `id`, `label`, `icon`, `activationKey`, `showInHeader`, `showInMenu`, `order`. Initial items: Services, Packages, Promotions. Imports nothing from old registries.

Selection flows `Header/SlideMenu onSelect(item.id)` → `AdminStationLayout.handleSelect` → context `navigate(id)`, which records `activeDestinationId`.

## Destination resolver

- `destinations.ts` — maps an activation key to a `StationDestination`. `AdminStationContext` resolves `activeDestinationId` to `activeDestination` (the seam); no surface is projected yet.

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

`resolveDestination(activation)` is a pure `DESTINATION_INDEX` lookup returning `null` for a null/unmapped key (the shell then falls back to Home). It holds **no entity logic**.

The current table maps the three nav items to `placement: 'body'`, `mode: 'table'`, `conditions.scope: 'current'`, `surfaceId: 'catalog'` — declaration only, inert until projection exists.

## Invariants

- **`stationId` values are AdminStation-native** (`services`/`packages`/`promotions`), **not** old-registry ids (`service-catalog`/`package-manager`). This tree resolves its own future registrations.
- **Lean registrations + a separate resolver table.** The resolver selects registrations; it never branches on entity.
- **`conditions` is not the runtime `MountCondition`.** `MountCondition` resolves *where* the app mounts in the DOM; `StationConditions` resolves *what data* a surface shows. Different axis — do not merge.
- **Record identity stays native/numeric** (term_id numeric; `recordId` is never a stringified display key).
- **Boundary note:** the one cross-tree reference is a type-only `import type { ShellMode }` from `components/admin/schema/types` — erased at build (verified: no `components/admin` runtime tokens in `admin-station.js`), the same sanctioned contract-crossing as `presentation/category-groups/types.ts` type-importing `ModuleNote`.

## Authoring guard

`assertDestinationsWellFormed` runs at module load and **throws** on a duplicate destination `id` or a fully-identical projection (`stationId + surfaceId + placement + mode + conditions`). The same surface at a different placement, mode, or scope is deliberate and passes.

## Deferred — the projection sequence

`stationId + surfaceId` currently address a **lean AdminStation registration table that does not exist yet** (declaration only). The next step builds that registry; then projection lands in order: **body → presentation wall (`placements.collections`) → shared two-tab drawer**. The two-tab drawer contract stays locked. See [Project History 008](../project-history/008-admin-station-engine-and-resolver.md).

## Related Code Maps

[Admin Station](admin-station.md), [Admin Station Cards](admin-station-cards.md).
