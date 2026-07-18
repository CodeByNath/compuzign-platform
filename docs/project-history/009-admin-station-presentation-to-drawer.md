# Admin Station: Real Data to Shared Drawer

## Date

2026-07-18

## Scope

The Admin Station's first complete, entity-agnostic surface path — from a real backend read, through a dynamic template-binding layer, to a fresh shared drawer — proven end to end with the Service Category Group as the first real consumer. Delivered in three approved phases. The generic entity-table body surface and additional stations remain out of scope.

## Goal

Turn the Admin Station shell (which only supplies locations) into a system that dynamically prints a registered template into a placement region and opens a shared drawer over a numeric record, without the shell, host, or controller ever branching on entity. Replace the earlier rigid `stationId + surfaceId → fixed EntitySchema` proposal, which was dropped.

## What Changed

**Phase 1 — real data.** A bundle-safe read (`stations/serviceCategoryGroup/`: `useServiceCategoryGroupCards` + pure `cardAdapter`) replaced the mock behind the Category Group card grid. Card identity became the numeric `term_id` (`CategoryGroupId`), carried unconverted. Metrics are truthful — only `assigned_count` (Assigned Categories) is shown, because the list route carries no others; status mirrors the authoritative pill resolver.

**Phase 2 — dynamic binding.** `AdminStationBody` stopped hardcoding a data source and kit. A declarative table (`stations/surfaceBindings.ts`) binds `station + surface + placement → dataSourceKey + templateKitKey + conditions + actionIntents`. `StationSurfaceHost` resolves the two keys and composes them (Rules-of-Hooks-safe via a keyed remount). Two registries (`dataSources.ts`, `presentation/templateKits.tsx`) hold the keyed reads and kits. Load-time guards fail loudly on duplicate or unresolvable bindings.

**Phase 3 — shared drawer.** A fresh, entity-agnostic drawer: a controller (`shell/drawer/AdminStationDrawerContext.tsx`) holding one open `{ drawerTemplateKey, recordId:number, mode }`, a shell (`AdminStationDrawer.tsx`) with View/Edit tabs, and a declarative registry (`stations/drawers/`) resolving a template key to content + supported modes. The Service Category Group drawer content is the first registered template; it reuses the authoritative `useServiceCategoryGroupStation` for mutations but imports no old drawer UI. The superseded `categoryGroupDrawer.ts` seam and the card's drawer-request types were deleted, leaving one intent→mode system.

## Final Architecture

```
card action → onIntent(recordId, actionId)
  → StationSurfaceHost → ResolvedStationIntent { recordId:number, intent, drawerTemplateKey }
    → drawer controller → shared drawer shell → View/Edit tab
      → entity-specific content, record loaded by numeric id → authoritative mutation hook
```

Two declarative layers (surface bindings, drawer templates), two generic composers (host, drawer shell), one controller — all entity-agnostic. Entity knowledge lives only in data-source hooks, template kits, and drawer content.

## Decisions and Invariants

- **Numeric identity end to end.** `term_id` stays a number from card action to endpoint; never stringified; preserved across View↔Edit switching.
- **Shell, host, and controller never branch on entity.** They resolve string keys; adding a surface or drawer is a registration, not a shell edit.
- **Bundle isolation preserved.** No old-tree renderer is value-imported into the Admin Station bundle; only pure state/logic/endpoints cross. The reused `useServiceCategoryGroupStation` is hoisted to a shared chunk carrying no UI.
- **This drawer's tabs are View/Edit** — a read surface and an edit surface — distinct from the old EntityDrawer's Details/Connections axis, which is untouched.
- **Fail loudly, degrade safely.** Registry guards throw at load; unresolved keys and missing records render neutral states.
- **The `→ EntitySchema` registration proposal is dropped**; bindings hold keys, not schemas.

## Validation

`tsc --noEmit` clean; production Vite build passes; `madge --circular` shows the same four pre-existing `components/admin` cycles with no new cycle (a `drawerTypes` module was extracted to avoid a registry↔content cycle). Source-level isolation audit confirms no old renderer crosses the bundle boundary. Numeric identity, View/Edit switching, close/reopen state reset, and the unresolved-intent neutral path are verified by type flow and code review; runtime was not exercised (there is no local WordPress runtime). `dist/` was rebuilt to one clean generation.

## Deferred Work

- Refreshing the presentation card wall after a drawer edit (cross-surface refresh signal); the drawer itself reflects saves.
- The generic entity-table **body** surface, and Packages/Promotions presentation and drawer registrations (no invented rows until real schema/source/content exist).
- A single-record GET endpoint (the drawer currently resolves a record from the complete list projection).

## Related History

[008 — Admin Station Engine and Resolver Foundation](008-admin-station-engine-and-resolver.md).
