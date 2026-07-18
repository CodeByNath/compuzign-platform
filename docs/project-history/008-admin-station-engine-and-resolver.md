# AdminStation Engine Boundary and Destination Resolver Foundation

## Date

2026-07-18

## Scope

The generic entity-table engine's source boundary in `components/admin`, and the new Admin Station destination resolver in `admin-station/navigation`. Together they are the foundation for the reusable Station engine. Projection (mounting real surfaces into the body, presentation wall, or drawer) is explicitly out of scope and deferred.

## Goal

Make the entity-table engine truly generic — no branch on entity identity — and give the Admin Station a declarative route/destination seam, so that one registration can later be mounted at different placements and under different conditions instead of each surface being hand-built.

## What Changed

The engine previously carried `TRAVEL_SOURCES` in `EntityTableStation` — a per-entity switch that value-imported Service endpoints and held only a `service` entry, so only Service could render while Category and Service Category Group declared complete table/travel templates that sat unused. That switch was evicted. The engine now reads the `TableSchema` from the declaration-only manifest (`ENTITIES[entity]`) and takes its runtime row loader plus lifecycle handlers from the **station registration's** `source` (`stations/entityTravelSources.ts`). Hidden Category and Service Category Group travel surfaces were registered, lighting them up through the same engine with no new templates. A generic handler-error banner surfaces rejected lifecycle actions (for example a 409 dependency guard on permanent delete) that previously escaped the confirm runner.

A destination resolver was then added to the Admin Station (`navigation/destinations.ts`). There is no URL router, so an **activation key** (a nav item id) resolves to a `StationDestination`. `AdminStationContext` resolves `activeDestinationId` into `activeDestination` and exposes it as the seam the shell will read once projection exists.

As a correction discovered during this work, an earlier copy pass had doubled and tripled "Service" across roughly twenty-five Service Category Group strings in TypeScript and PHP; those were repaired. This is noted only as a fix, not part of the architecture.

## Final Architecture

`EntityTableStation` is entity-agnostic: the `entity-table` `StationSurface` variant carries `source: { useRows, handlers }`, manifests stay declaration-only, and adding an entity costs one registration entry plus that entity's loader.

The resolver chain is: `activation key → resolveDestination() → registration (stationId + surfaceId) → placement → mode → conditions / record id → shell region`. `StationDestination` = `{ id, stationId, surfaceId, placement, mode, conditions? }`; `StationConditions` = `{ scope?, recordId?, categoryTermId?, relatedTo? }`. A separate resolver table maps activation keys to destinations and contains no entity logic; an authoring guard runs at module load.

## Decisions and Invariants

- The engine holds **zero** entity-identity branches; runtime source lives at the registration boundary, never on `EntitySchema` (manifest purity).
- The Admin Station **owns routing**: lean registrations plus a separate resolver table. `stationId` values are AdminStation-native, never old-registry ids.
- `StationConditions` is **not** the runtime `MountCondition` — one resolves what data a surface shows, the other where the app mounts in the DOM. They are never merged.
- Record identity stays native/numeric (`term_id` numeric; `recordId` never a stringified display key).
- The one cross-tree reference is a type-only `import type { ShellMode }`, erased at build — a sanctioned contract-crossing, not a boundary breach.
- The two-tab drawer contract remains locked.

## Validation

`npx tsc --noEmit` clean; production build passes and is deterministic; `madge` shows the four pre-existing cycles with no new cycle. Bundle isolation was verified empirically — no `components/admin` runtime tokens appear in `admin-station.js`. The resolver guard was exercised against the compiled module: duplicate id and fully-identical projection throw, while the same surface at a different mode or scope passes. Runtime rendering was not exercised locally (there is no local WordPress runtime).

## Deferred Work

- The lean AdminStation registration table that `stationId` + `surfaceId` resolve against.
- Projection, in order: body → presentation wall (`placements.collections`) → shared two-tab drawer.

## Related History

[007 — Service Manager UI and Drawer Integration](007-service-manager-ui-drawer-integration.md).
